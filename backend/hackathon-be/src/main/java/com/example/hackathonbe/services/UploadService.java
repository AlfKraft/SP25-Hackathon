package com.example.hackathonbe.services;

import com.example.hackathonbe.upload.model.ErrorCode;
import com.example.hackathonbe.upload.model.ParticipantPreviewRow;
import com.example.hackathonbe.upload.model.ValidationReport;
import com.example.hackathonbe.upload.parse.CsvParser;
import com.example.hackathonbe.upload.parse.SpreadsheetParser;
import com.example.hackathonbe.upload.parse.XlsxParser;
import com.example.hackathonbe.upload.preview.PreviewCache;
import org.apache.commons.validator.routines.EmailValidator;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class UploadService {

    private final PreviewCache cache = new PreviewCache();
    private final EmailValidator emailValidator = EmailValidator.getInstance();

    private static final Set<String> REQUIRED_HEADERS = Set.of("email", "skills", "motivation");

    public ValidationReport validate(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        final String filename = Optional.of(file.getOriginalFilename()).orElse("");
        final String ext = extractExt(filename);

        final List<ParticipantPreviewRow> rows = getParticipantPreviewRows(file, ext);

        // No rows parsed → treat as missing header/content
        if (rows.isEmpty()) {
            return new ValidationReport(
                    null, 0, 0, 0,
                    List.of(new ValidationReport.TopError(ErrorCode.MISSING_HEADER.name(), 1L))
            );
        }

        // Header validation
        final Set<String> headers = rows.get(0).fields().keySet().stream()
                .map(String::toLowerCase)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        final List<ErrorCode> headerErrors = new ArrayList<>();
        for (String req : REQUIRED_HEADERS) {
            if (!headers.contains(req)) {
                headerErrors.add(ErrorCode.MISSING_HEADER);
            }
        }

        // Row validation
        final List<ParticipantPreviewRow> validated = new ArrayList<>(rows.size());
        final List<ErrorCode> rowErrors = new ArrayList<>();
        int valid = 0;

        for (ParticipantPreviewRow r : rows) {
            boolean ok = headerErrors.isEmpty();
            final String email = get(r, "email");
            final String skills = get(r, "skills");
            final String motivation = get(r, "motivation");

            if (email.isBlank() || !emailValidator.isValid(email)) {
                rowErrors.add(ErrorCode.INVALID_EMAIL);
                ok = false;
            }
            if (skills.isBlank()) {
                rowErrors.add(ErrorCode.MISSING_SKILLS);
                ok = false;
            }
            if (motivation.isBlank()) {
                rowErrors.add(ErrorCode.EMPTY_MOTIVATION);
                ok = false;
            }

            if (ok) valid++;
            validated.add(new ParticipantPreviewRow(r.fields(), ok));
        }

        final int total = validated.size();
        final int invalid = total - valid;

        final Map<ErrorCode, Long> counts = new ArrayList<ErrorCode>() {{
            addAll(headerErrors);
            addAll(rowErrors);
        }}.stream().collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        final List<ValidationReport.TopError> top = counts.entrySet().stream()
                .sorted(Map.Entry.<ErrorCode, Long>comparingByValue().reversed())
                .limit(3)
                .map(e -> new ValidationReport.TopError(e.getKey().name(), e.getValue()))
                .toList();

        final UUID id = cache.put(validated);
        return new ValidationReport(id, total, valid, invalid, top);
    }

    private static List<ParticipantPreviewRow> getParticipantPreviewRows(MultipartFile file, String ext) throws Exception {
        final SpreadsheetParser parser = switch (ext) {
            case "csv" -> new CsvParser();
            case "xlsx", "xlsm", "xls" -> new XlsxParser();
            default -> throw new IllegalArgumentException("Unsupported file type: " + (ext.isBlank() ? "<none>" : ext));
        };

        final List<ParticipantPreviewRow> rows;
        try (InputStream in = file.getInputStream()) {
            rows = parser.parse(in);
        } catch (IllegalArgumentException iae) {
            throw iae;
        } catch (IOException ioe) {
            throw new IllegalArgumentException("Unsupported or corrupt file", ioe);
        }
        return rows;
    }

    private static String extractExt(String filename) {
        final String lower = filename.toLowerCase(Locale.ROOT);
        final int dot = lower.lastIndexOf('.');
        return dot >= 0 ? lower.substring(dot + 1) : "";
    }

    private static String get(ParticipantPreviewRow row, String key) {
        return Optional.ofNullable(row.fields().get(key))
                .map(String::trim)
                .orElse("")
                .toLowerCase(Locale.ROOT)
                .strip();
    }
}
