package com.example.hackathonbe.services;

import com.example.hackathonbe.repositories.ParticipantRepository;
import com.example.hackathonbe.upload.model.*;
import com.example.hackathonbe.upload.parse.CsvParser;
import com.example.hackathonbe.upload.parse.SpreadsheetParser;
import com.example.hackathonbe.upload.parse.XlsxParser;
import com.example.hackathonbe.upload.preview.PreviewCache;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.Cacheable;
import lombok.RequiredArgsConstructor;
import org.apache.commons.validator.routines.EmailValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Cacheable
public class UploadService {
    private final ParticipantRepository participantRepository;
    private final PreviewCache cache = new PreviewCache();

    public ValidationReport validate(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            return new ValidationReport(null,0,0,0,List.of(), List.of());
        }

        SpreadsheetParser parser = switch (ext(file.getOriginalFilename())) {
            case "csv" -> new CsvParser();
            case "xlsx","xlsm" -> new XlsxParser();
            default -> null;
        };
        if (parser == null) {
            return new ValidationReport(null,0,0,0,
                    List.of(new ValidationReport.TopError("UNSUPPORTED_FILE_TYPE",1)), List.of());
        }

        List<ParticipantPreviewRow> parsed;
        try (InputStream in = file.getInputStream()) {
            parsed = parser.parse(in);
        }

        Map<String,Long> top = new LinkedHashMap<>();
        List<ValidationReport.CellError> cells = new ArrayList<>();
        List<ParticipantPreviewRow> normalized = new ArrayList<>(parsed.size());

        // Collect present keys to compute UNKNOWN_HEADER and (optional) MISSING_HEADER
        Set<String> present = parsed.stream()
                .flatMap(r -> r.fields().keySet().stream())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        // UNKNOWN_HEADER: report at column level (row 1)
        for (ParticipantPreviewRow r : parsed) {
            for (var e : r.keyToHeader().entrySet()) {
                String key = e.getKey();
                if (!Keys.KNOWN.contains(key)) {
                    int col = r.keyToColumn().get(key);
                    cells.add(new ValidationReport.CellError(
                            1,                        // header row
                            col,
                            key,
                            e.getValue(),            // original header
                            "UNKNOWN_HEADER",
                            null
                    ));
                }
            }
            break; // only need headers once
        }
        long unknownCount = present.stream().filter(k -> !Keys.KNOWN.contains(k)).count();
        if (unknownCount > 0) top.merge("UNKNOWN_HEADER", unknownCount, Long::sum);

        // Optional MISSING_HEADER
        if (!Keys.REQUIRED_MIN.isEmpty()) {
            Set<String> miss = new LinkedHashSet<>(Keys.REQUIRED_MIN);
            miss.removeAll(present);
            if (!miss.isEmpty()) {
                for (String m : miss) {
                    cells.add(new ValidationReport.CellError(
                            1, null, m, m, "MISSING_HEADER", null
                    ));
                }
                top.merge("MISSING_HEADER", 1L, Long::sum);
            }
        }

        // Row by row checks
        for (ParticipantPreviewRow r : parsed) {
            var f = r.fields();
            boolean ok = true;

            // Email
            String email = nz(f.get("email"));
            if (!email.isBlank() && !EmailValidator.getInstance().isValid(email)) {
                add(top, "INVALID_EMAIL");
                cells.add(cell(r, "email", "INVALID_EMAIL", email));
                ok = false; // your logic: invalid email -> invalid row
            }

            // motivation: integer 0..100 (invalidate if bad)
            String m = nz(f.get("motivation"));
            if (!m.isBlank()) {
                boolean goodInt = m.matches("^\\d{1,3}$");
                Integer mv = null;
                if (goodInt) mv = Integer.parseInt(m);
                if (!goodInt || mv < 0 || mv > 100) {
                    add(top, "INVALID_VALUE:motivation");
                    cells.add(cell(r, "motivation", "INVALID_VALUE:motivation", m));
                    ok = false;
                }
            }

            normalized.add(new ParticipantPreviewRow(f, ok, r.rowNumber(), r.keyToColumn(), r.keyToHeader()));
        }

        int total = normalized.size();
        int valid = (int) normalized.stream().filter(ParticipantPreviewRow::valid).count();
        int invalid = total - valid;
        UUID id = cache.put(normalized);

        List<ValidationReport.TopError> topErrors = top.entrySet().stream()
                .sorted(Map.Entry.<String,Long>comparingByValue().reversed())
                .map(e -> new ValidationReport.TopError(e.getKey(), e.getValue()))
                .toList();

        return new ValidationReport(id, total, valid, invalid, topErrors, cells);
    }

    /* --- helpers --- */
    private static void add(Map<String,Long> top, String code){ top.merge(code, 1L, Long::sum); }
    private static String nz(String s){ return s==null? "": s; }
    private static ValidationReport.CellError cell(ParticipantPreviewRow r, String key, String code, String value){
        Integer col = r.keyToColumn().get(key);
        String hdr = r.keyToHeader().getOrDefault(key, key);
        return new ValidationReport.CellError(r.rowNumber(), col, key, hdr, code, value);
    }
    private static String ext(String filename) {
        if (filename == null) return "";
        String name = filename.trim();
        // strip any path (IE/old browsers sometimes include it)
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) name = name.substring(slash + 1);
        int dot = name.lastIndexOf('.');
        return (dot < 0 || dot == name.length() - 1) ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    @Transactional
    public ImportSummary importValid(UUID previewId) {
        List<ParticipantPreviewRow> rows = cache.get(previewId);
        if (rows == null) return null;

        int total = rows.size();
        int skipped = 0;

        List<ObjectNode> validJson = new ArrayList<>();
        for (var r : rows) {
            ObjectNode json = ParticipantJson.toJson(r.fields());
            var errs = ParticipantJson.validate(json);
            if (!errs.isEmpty()) { skipped++; continue; }
            validJson.add(json);
        }

        // 2) dedupe by email (latest wins)
        Map<String, ObjectNode> byEmail = new LinkedHashMap<>();
        for (ObjectNode j : validJson) {
            byEmail.put(j.get("email").asText().toLowerCase(Locale.ROOT), j);
        }
        int deduped = validJson.size() - byEmail.size();

        // 3) fetch existing
        Map<String, Participant> existing = participantRepository.findAllByEmailIn(byEmail.keySet()).stream()
                .collect(Collectors.toMap(p -> p.getEmail().toLowerCase(Locale.ROOT), p -> p));

        // 4) upsert (sync columns + jsonb)
        int inserted = 0, updated = 0;
        List<Participant> toSave = new ArrayList<>();
        for (var e : byEmail.entrySet()) {
            String email = e.getKey();
            ObjectNode data = e.getValue();

            Participant p = existing.get(email);
            if (p == null) {
                p = new Participant();
                p.setEmail(email);
                p.setFirstName(data.get("first_name").asText());
                p.setLastName(data.get("last_name").asText());
                p.setData(data);
                inserted++;
            } else {
                p.setFirstName(data.get("first_name").asText());
                p.setLastName(data.get("last_name").asText());
                p.setData(data);
                updated++;
            }
            toSave.add(p);
        }
        participantRepository.saveAll(toSave);

        return new ImportSummary(total, inserted, updated, skipped, deduped);
    }
}
