package com.example.hackathonbe.importing.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
import com.example.hackathonbe.hackathon.model.CoreFieldKey;
import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.hackathon.service.QuestionnaireService;
import com.example.hackathonbe.importing.model.*;
import com.example.hackathonbe.importing.parse.CsvParser;
import com.example.hackathonbe.importing.parse.SpreadsheetParser;
import com.example.hackathonbe.importing.parse.XlsxParser;
import com.example.hackathonbe.importing.preview.PreviewCache;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.validator.routines.EmailValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UploadService {

    private final ParticipantRepository participantRepository;
    private final HackathonRepository hackathonRepository;
    private final QuestionnaireService questionnaireService;
    private final QuestionnaireAnswerRepository questionnaireAnswerRepository;

    private final PreviewCache previewCache = new PreviewCache();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Validate uploaded CSV/XLSX file and store preview rows in cache.
     * Returns a ValidationReport that frontend can display.
     *
     * NOTE: file missing/empty is a request error -> 400.
     */
    public ValidationReport validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }

        SpreadsheetParser parser = resolveParser(file.getOriginalFilename());
        if (parser == null) {
            // keep UX: return a report instead of throwing
            return new ValidationReport(
                    null,
                    0,
                    0,
                    0,
                    List.of(new ValidationReport.TopError("UNSUPPORTED_FILE_TYPE", 1)),
                    List.of()
            );
        }

        List<ParticipantPreviewRow> parsedRows = parseFile(parser, file);

        // Build validation report
        Map<String, Long> topErrorCounts = new LinkedHashMap<>();
        List<ValidationReport.CellError> cellErrors = new ArrayList<>();
        List<ParticipantPreviewRow> normalizedRows = new ArrayList<>(parsedRows.size());

        Set<String> presentKeys = parsedRows.stream()
                .flatMap(row -> row.fields().keySet().stream())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        addUnknownHeaderErrors(parsedRows, presentKeys, topErrorCounts, cellErrors);
        addMissingHeaderErrors(presentKeys, topErrorCounts, cellErrors);

        for (ParticipantPreviewRow parsedRow : parsedRows) {
            Map<String, String> fields = parsedRow.fields();
            boolean rowValid = true;

            // Email validation (invalid email -> invalid row)
            String email = nullToEmpty(fields.get("email"));
            if (!email.isBlank() && !EmailValidator.getInstance().isValid(email)) {
                increment(topErrorCounts, "INVALID_EMAIL");
                cellErrors.add(cell(parsedRow, "email", "INVALID_EMAIL", email));
                rowValid = false;
            }

            // motivation: integer 0..100 (your current constraints)
            String motivationText = nullToEmpty(fields.get("motivation"));
            if (!motivationText.isBlank()) {
                boolean isInt = motivationText.matches("^\\d{1,3}$");
                Integer motivationValue = isInt ? Integer.parseInt(motivationText) : null;

                if (!isInt || motivationValue < 0 || motivationValue > 100) {
                    increment(topErrorCounts, "INVALID_VALUE:motivation");
                    cellErrors.add(cell(parsedRow, "motivation", "INVALID_VALUE:motivation", motivationText));
                    rowValid = false;
                }
            }

            normalizedRows.add(new ParticipantPreviewRow(
                    fields,
                    rowValid,
                    parsedRow.rowNumber(),
                    parsedRow.keyToColumn(),
                    parsedRow.keyToHeader()
            ));
        }

        int totalRows = normalizedRows.size();
        int validRows = (int) normalizedRows.stream().filter(ParticipantPreviewRow::valid).count();
        int invalidRows = totalRows - validRows;

        UUID previewId = previewCache.put(normalizedRows);

        List<ValidationReport.TopError> topErrors = topErrorCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(entry -> new ValidationReport.TopError(entry.getKey(), entry.getValue()))
                .toList();

        return new ValidationReport(previewId, totalRows, validRows, invalidRows, topErrors, cellErrors);
    }

    /**
     * Import only valid preview rows (cached by previewId) to hackathon.
     * Creates an EXTERNAL questionnaire JSON based on headers and saves answers as flat objects.
     */
    @Transactional
    public ImportSummary importValid(UUID previewId, Long hackathonId) {
        if (previewId == null) {
            throw new BadRequestException("previewId is required");
        }
        if (hackathonId == null || hackathonId <= 0) {
            throw new BadRequestException("Invalid hackathon id");
        }

        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        List<ParticipantPreviewRow> previewRows = previewCache.get(previewId);
        if (previewRows == null) {
            throw new NotFoundException("Preview not found or expired: " + previewId);
        }
        if (previewRows.isEmpty()) {
            return new ImportSummary(0, 0, 0, 0, 0);
        }

        JsonNode externalQuestionnaireJson = createExternalQuestionnaireJson(previewRows);
        Questionnaire questionnaire = questionnaireService.saveExternalQuestionnaire(hackathon, externalQuestionnaireJson);

        int total = previewRows.size();
        int skipped = 0;

        List<ObjectNode> validObjects = new ArrayList<>();
        for (ParticipantPreviewRow row : previewRows) {
            ObjectNode participantJson = ParticipantJson.toJson(row.fields());
            List<String> validationErrors = ParticipantJson.validate(participantJson);
            if (!validationErrors.isEmpty()) {
                skipped++;
                continue;
            }
            validObjects.add(participantJson);
        }

        // Dedupe by email (latest wins)
        Map<String, ObjectNode> byEmail = new LinkedHashMap<>();
        for (ObjectNode rowObject : validObjects) {
            String email = rowObject.get("email").asText("").trim().toLowerCase(Locale.ROOT);
            if (!email.isBlank()) {
                byEmail.put(email, rowObject);
            }
        }
        int deduped = validObjects.size() - byEmail.size();

        // Fetch existing participants by email
        Map<String, Participant> existingByEmail = participantRepository.findAllByEmailIn(byEmail.keySet()).stream()
                .collect(Collectors.toMap(
                        participant -> participant.getEmail().toLowerCase(Locale.ROOT),
                        participant -> participant
                ));

        int inserted = 0;
        int updated = 0;

        for (Map.Entry<String, ObjectNode> entry : byEmail.entrySet()) {
            String email = entry.getKey();
            ObjectNode data = entry.getValue();

            Participant participant = existingByEmail.get(email);
            if (participant == null) {
                participant = new Participant();
                participant.setEmail(email);
                participant.setFirstName(data.get("first_name").asText());
                participant.setLastName(data.get("last_name").asText());
                participant = participantRepository.save(participant);
                inserted++;
            } else {
                participant.setFirstName(data.get("first_name").asText());
                participant.setLastName(data.get("last_name").asText());
                participant = participantRepository.save(participant);
                updated++;
            }

            hackathon.addParticipant(participant);

            Participant finalParticipant = participant;
            QuestionnaireAnswer questionnaireAnswer = questionnaireAnswerRepository
                    .findByQuestionnaireAndParticipant(questionnaire, participant)
                    .orElseGet(() -> {
                        QuestionnaireAnswer newAnswer = new QuestionnaireAnswer();
                        newAnswer.setQuestionnaire(questionnaire);
                        newAnswer.setParticipant(finalParticipant);
                        return newAnswer;
                    });

            questionnaireAnswer.setData(data);
            questionnaireAnswerRepository.save(questionnaireAnswer);
        }

        hackathonRepository.save(hackathon);

        return new ImportSummary(total, inserted, updated, skipped, deduped);
    }

    /**
     * Creates external questionnaire JSON structure from preview header mapping.
     * NOTE: this uses KEYS (e.g. "first_name") not header display names.
     */
    public JsonNode createExternalQuestionnaireJson(List<ParticipantPreviewRow> previewRows) {
        if (previewRows == null || previewRows.isEmpty()) {
            return objectMapper.createObjectNode();
        }

        ParticipantPreviewRow headerRow = previewRows.get(0);

        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode questions = objectMapper.createArrayNode();
        root.set("questions", questions);

        int questionIndex = 1;

        // Use keys, and map to header labels where needed
        for (String key : headerRow.keyToHeader().keySet()) {
            CoreFieldKey coreKey = CoreFieldKey.fromKey(key);
            if (coreKey == null) {
                continue;
            }

            ObjectNode question = objectMapper.createObjectNode();
            question.put("id", UUID.randomUUID().toString());
            question.put("key", key);
            question.put("label", coreKey.defaultLabel());
            question.put("type", coreKey.defaultType());
            questions.add(question);
        }

        return root;
    }

    // =========================================================
    // Internal helpers
    // =========================================================

    private SpreadsheetParser resolveParser(String originalFilename) {
        String extension = fileExtension(originalFilename);
        return switch (extension) {
            case "csv" -> new CsvParser();
            case "xlsx", "xlsm" -> new XlsxParser();
            default -> null;
        };
    }

    private List<ParticipantPreviewRow> parseFile(SpreadsheetParser parser, MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            return parser.parse(inputStream);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read file");
        } catch (Exception e) {
            // Parser errors are user-input errors (bad format)
            throw new BadRequestException("Failed to parse file. Please upload a valid CSV/XLSX.");
        }
    }

    private void addUnknownHeaderErrors(
            List<ParticipantPreviewRow> parsedRows,
            Set<String> presentKeys,
            Map<String, Long> topErrorCounts,
            List<ValidationReport.CellError> cellErrors
    ) {
        if (parsedRows.isEmpty()) return;

        ParticipantPreviewRow firstRow = parsedRows.get(0);

        for (Map.Entry<String, String> entry : firstRow.keyToHeader().entrySet()) {
            String key = entry.getKey();
            if (!Keys.KNOWN.contains(key)) {
                Integer columnIndex = firstRow.keyToColumn().get(key);
                cellErrors.add(new ValidationReport.CellError(
                        1,
                        columnIndex,
                        key,
                        entry.getValue(),
                        "UNKNOWN_HEADER",
                        null
                ));
            }
        }

        long unknownCount = presentKeys.stream().filter(key -> !Keys.KNOWN.contains(key)).count();
        if (unknownCount > 0) {
            topErrorCounts.merge("UNKNOWN_HEADER", unknownCount, Long::sum);
        }
    }

    private void addMissingHeaderErrors(
            Set<String> presentKeys,
            Map<String, Long> topErrorCounts,
            List<ValidationReport.CellError> cellErrors
    ) {
        if (Keys.REQUIRED_MIN.isEmpty()) return;

        Set<String> missing = new LinkedHashSet<>(Keys.REQUIRED_MIN);
        missing.removeAll(presentKeys);

        if (missing.isEmpty()) return;

        for (String missingKey : missing) {
            cellErrors.add(new ValidationReport.CellError(
                    1,
                    null,
                    missingKey,
                    missingKey,
                    "MISSING_HEADER",
                    null
            ));
        }

        topErrorCounts.merge("MISSING_HEADER", (long) missing.size(), Long::sum);
    }

    private static void increment(Map<String, Long> counters, String code) {
        counters.merge(code, 1L, Long::sum);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static ValidationReport.CellError cell(
            ParticipantPreviewRow row,
            String key,
            String code,
            String value
    ) {
        Integer column = row.keyToColumn().get(key);
        String header = row.keyToHeader().getOrDefault(key, key);
        return new ValidationReport.CellError(row.rowNumber(), column, key, header, code, value);
    }

    private static String fileExtension(String filename) {
        if (filename == null) return "";

        String name = filename.trim();
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (slash >= 0) name = name.substring(slash + 1);

        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) return "";

        return name.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
