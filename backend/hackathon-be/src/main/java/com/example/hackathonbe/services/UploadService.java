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
            return new ValidationReport(null, 0, 0, 0, List.of());
        }

        final String ext = extractExt(file.getOriginalFilename());
        final SpreadsheetParser parser = switch (ext) {
            case "csv"  -> new CsvParser();
            case "xlsx", "xlsm" -> new XlsxParser();
            default -> null;
        };

        if (parser == null) {
            return new ValidationReport(
                    null, 0, 0, 0,
                    List.of(new ValidationReport.TopError("UNSUPPORTED_FILE_TYPE", 1))
            );
        }

        List<ParticipantPreviewRow> rows;
        try (InputStream in = file.getInputStream()) {
            rows = parser.parse(in);
        }

        List<ParticipantPreviewRow> normalized = new ArrayList<>(rows.size());
        for (ParticipantPreviewRow r : rows) {
            boolean valid = softValid(r.fields());
            normalized.add(new ParticipantPreviewRow(r.fields(), valid));
        }

        Set<String> presentHeaders = normalized.stream()
                .flatMap(r -> r.fields().keySet().stream())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, Long> top = new LinkedHashMap<>();

        if (!Keys.REQUIRED_MIN.isEmpty()) {
            Set<String> missing = new LinkedHashSet<>(Keys.REQUIRED_MIN);
            missing.removeAll(presentHeaders);
            if (!missing.isEmpty()) {
                top.merge("MISSING_HEADER", 1L, Long::sum);
            }
        }

        Set<String> unknown = presentHeaders.stream()
                .filter(h -> !Keys.KNOWN.contains(h))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!unknown.isEmpty()) {
            top.merge("UNKNOWN_HEADER", (long) unknown.size(), Long::sum);
        }

        for (ParticipantPreviewRow row : normalized) {
            String email = nz(row.fields().get("email"));
            if (!email.isBlank() && !EmailValidator.getInstance().isValid(email)) {
                top.merge("INVALID_EMAIL", 1L, Long::sum);
            }

            String age = nz(row.fields().get("age"));
            if (!age.isBlank() && !age.matches("^\\d{1,3}$")) {
                top.merge("INVALID_VALUE:age", 1L, Long::sum);
            }
        }

        int total = normalized.size();
        int valid = (int) normalized.stream().filter(ParticipantPreviewRow::valid).count();
        int invalid = total - valid;

        UUID previewId = cache.put(normalized);

        List<ValidationReport.TopError> topErrors = top.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new ValidationReport.TopError(e.getKey(), e.getValue()))
                .toList();

        return new ValidationReport(previewId, total, valid, invalid, topErrors);
    }



    private static boolean softValid(Map<String, String> f) {
        boolean ok = true;

        if (f.containsKey("first_name")) ok &= notBlank(f.get("first_name"));
        if (f.containsKey("last_name"))  ok &= notBlank(f.get("last_name"));

        if (f.containsKey("email")) {
            String email = nz(f.get("email"));
            ok &= email.isBlank() || EmailValidator.getInstance().isValid(email);
        }

        // Example: if they say they'll present, require minimal idea info
        if ("yes".equalsIgnoreCase(nz(f.get("will_present_idea")))) {
            ok &= !nz(f.get("idea_name")).isBlank();
            ok &= !nz(f.get("problem")).isBlank();
        }

        return ok;
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }

    private static String nz(String s) { return s == null ? "" : s; }

    private static String extractExt(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        return dot >= 0 ? lower.substring(dot + 1) : "";
    }
}
