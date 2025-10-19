package com.example.hackathonbe.services;

import com.example.hackathonbe.upload.model.Keys;
import com.example.hackathonbe.upload.model.ParticipantPreviewRow;
import com.example.hackathonbe.upload.model.ValidationReport;
import com.example.hackathonbe.upload.parse.CsvParser;
import com.example.hackathonbe.upload.parse.SpreadsheetParser;
import com.example.hackathonbe.upload.parse.XlsxParser;
import com.example.hackathonbe.upload.preview.PreviewCache;
import org.apache.commons.validator.routines.EmailValidator;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class UploadService {

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
                    int col = Optional.ofNullable(r.keyToColumn().get(key)).orElse(null);
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
}
