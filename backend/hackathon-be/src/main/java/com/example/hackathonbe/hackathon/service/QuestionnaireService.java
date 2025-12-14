package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.hackathon.dto.PublishDto;
import com.example.hackathonbe.hackathon.dto.QuestionnaireDto;
import com.example.hackathonbe.hackathon.dto.SubmitQuestionnaireAnswersDto;
import com.example.hackathonbe.hackathon.model.*;
import com.example.hackathonbe.hackathon.repository.HackathonRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireAnswerRepository;
import com.example.hackathonbe.hackathon.repository.QuestionnaireRepository;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.StreamSupport;

@Service
public class QuestionnaireService {

    private final QuestionnaireRepository questionnaireRepository;
    private final HackathonRepository hackathonRepository;
    private final ParticipantRepository participantRepository;
    private final QuestionnaireAnswerRepository questionnaireAnswerRepository;
    private final ObjectMapper objectMapper;

    public QuestionnaireService(QuestionnaireRepository questionnaireRepository,
                                HackathonRepository hackathonRepository,
                                ParticipantRepository participantRepository,
                                QuestionnaireAnswerRepository questionnaireAnswerRepository, ObjectMapper objectMapper) {
        this.questionnaireRepository = questionnaireRepository;
        this.hackathonRepository = hackathonRepository;
        this.participantRepository = participantRepository;
        this.questionnaireAnswerRepository = questionnaireAnswerRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Create or replace an INTERNAL questionnaire JSON for a given hackathon.
     * Used by your own questionnaire builder.
     */
    @Transactional
    public QuestionnaireDto saveInternalQuestionnaire(Long hackathonId, JsonNode questionsJson) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        Questionnaire questionnaire;

        if (hackathon.getQuestionnaire() != null && hackathon.getQuestionnaire().getSource() == QuestionnaireSource.EXTERNAL_UPLOAD) {
            throw new IllegalStateException("External questionnaire already exists for hackathon: " + hackathonId + " (Questionnaire: " + hackathon.getQuestionnaire().getId() + " from: " + hackathon.getQuestionnaire().getSource() + ")");
        }
        if (hackathon.getQuestionnaire() != null && hackathon.getQuestionnaire().getSource() == QuestionnaireSource.INTERNAL) {
            questionnaire = hackathon.getQuestionnaire();
        }
        else{
            questionnaire = new Questionnaire();
            questionnaire.setSource(QuestionnaireSource.INTERNAL);

        }
        //validateRequiredQuestions(questionsJson);
        questionnaire.setStatus(QuestionnaireStatus.DRAFT);
        questionnaire.setQuestions(questionsJson);
        hackathon.setQuestionnaire(questionnaire);
        hackathonRepository.save(hackathon);

        Boolean isLocked = questionnaire.getStatus() == QuestionnaireStatus.LOCKED;
        return new QuestionnaireDto(questionnaire.getId(), hackathon.getId(), questionnaire.getSource(), isLocked, questionnaire.getStatus(), hackathon.getQuestionnaire().getQuestions().get("questions"));
    }

    /**
     * Create a LOCKED questionnaire from an external upload (e.g., Google Forms).
     * Caller is responsible for building the JSON structure.
     */
    @Transactional
    public Questionnaire saveExternalQuestionnaire(Hackathon hackathon, JsonNode questionsJson) {
        //validateRequiredQuestions(questionsJson);
        if (hackathon == null) {
            throw new IllegalArgumentException("Hackathon cannot be null");
        }
        if (hackathon.getId() == null) {
            throw new IllegalArgumentException("Hackathon must be persisted before adding a questionnaire");
        }
        Questionnaire questionnaire = new Questionnaire();
        if (hackathon.getQuestionnaire() != null) {
            questionnaire = hackathon.getQuestionnaire();
        }

        questionnaire.setSource(QuestionnaireSource.EXTERNAL_UPLOAD);
        questionnaire.setStatus(QuestionnaireStatus.LOCKED);
        questionnaire.setQuestions(questionsJson);
        hackathon.setQuestionnaire(questionnaire);
        hackathonRepository.save(hackathon);
        return hackathon.getQuestionnaire();
    }

    /**
     * Get questionnaire JSON for a hackathon.
     */
    @Transactional(readOnly = true)
    public QuestionnaireDto getQuestionsForHackathon(Long hackathonId) {

        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));

        Boolean isLocked = hackathon.getQuestionnaire().getStatus() == QuestionnaireStatus.LOCKED;
        return new QuestionnaireDto(hackathon.getQuestionnaire().getId(), hackathonId, hackathon.getQuestionnaire().getSource(), isLocked, hackathon.getQuestionnaire().getStatus(), hackathon.getQuestionnaire().getQuestions().get("questions"));
    }

    @Transactional
    public PublishDto publishInternalQuestionnaire(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        Questionnaire q = hackathon.getQuestionnaire();
        if (!q.getSource().equals(QuestionnaireSource.INTERNAL)) {
            throw new IllegalStateException("Only INTERNAL questionnaires can be published");
        }
        if (q.getStatus().equals(QuestionnaireStatus.PUBLISHED)) {
            q.setStatus(QuestionnaireStatus.DRAFT);
        }
        else if (q.getStatus().equals(QuestionnaireStatus.DRAFT)) {
            q.setStatus(QuestionnaireStatus.PUBLISHED);
        }
        else{
            throw new IllegalStateException("Questionnaire is not in a valid state for publishing: " + q.getStatus());
        }

        questionnaireRepository.save(q);

        return new PublishDto(q.getId(), q.getStatus());
    }

    @Transactional(readOnly = true)
    public JsonNode getPublicQuestionnaire(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        Questionnaire q = hackathon.getQuestionnaire();
        if (q.getSource() == QuestionnaireSource.INTERNAL &&
                q.getStatus() != QuestionnaireStatus.PUBLISHED) {
            throw new IllegalStateException("Questionnaire is not published for hackathon: " + hackathonId);
        }

        // EXTERNAL_UPLOAD + LOCKED is always fine to expose
        return q.getQuestions();
    }

    @Transactional
    public void submitAnswers(Long hackathonId, SubmitQuestionnaireAnswersDto dto) {

        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));

        // 1) Validate questionnaire status first (optional but usually better)
        Questionnaire questionnaire = getQuestionnaire(hackathon);
        validateQuestionnaireIsSubmittable(questionnaire); // implement your PUBLISHED/LOCKED rule

        // 2) Normalize answers once
        JsonNode answersNode = dto.answers();
        if (answersNode == null || !answersNode.isArray()) {
            throw new IllegalArgumentException("answers must be an array");
        }

        Map<String, JsonNode> byKey = toAnswerMap(answersNode);

        // 3) Required fields (systemRequired)
        String email = requireText(byKey, "email");
        String firstName = requireText(byKey, "first_name");
        String lastName = requireText(byKey, "last_name");

        // 4) Find or create participant
        Participant participant = participantRepository.findByEmail(email)
                .orElseGet(() -> {
                    Participant p = new Participant();
                    p.setEmail(email);
                    p.setFirstName(firstName);
                    p.setLastName(lastName);
                    return participantRepository.save(p);
                });

        // 5) Ensure participant is registered to this hackathon (avoid duplicates)
        if (!hackathon.getParticipants().contains(participant)) {
            hackathon.addParticipant(participant);
            hackathonRepository.save(hackathon);
        }

        // 6) Upsert questionnaire answers (1 per questionnaire+participant)
        QuestionnaireAnswer qa = questionnaireAnswerRepository
                .findByQuestionnaireAndParticipant(questionnaire, participant)
                .orElseGet(() -> {
                    QuestionnaireAnswer fresh = new QuestionnaireAnswer();
                    fresh.setQuestionnaire(questionnaire);
                    fresh.setParticipant(participant);
                    return fresh;
                });

        qa.setData(answersNode); // or dto.answers()
        questionnaireAnswerRepository.save(qa);
    }

    /** Convert answers array into key -> answerNode. */
    private Map<String, JsonNode> toAnswerMap(JsonNode answersArray) {
        Map<String, JsonNode> map = new HashMap<>();
        for (JsonNode a : answersArray) {
            String key = a.path("key").asText(null);
            if (key == null || key.isBlank()) continue;
            map.put(key, a);
        }
        return map;
    }

    /** Extract valueText (trimmed) and enforce presence. */
    private String requireText(Map<String, JsonNode> byKey, String key) {
        JsonNode node = byKey.get(key);
        if (node == null) {
            throw new IllegalArgumentException("Missing required answer: " + key);
        }
        String value = node.path("valueText").asText("").trim();
        if (value.isBlank()) {
            throw new IllegalArgumentException("Missing required answer: " + key);
        }
        return value;
    }

    private void validateQuestionnaireIsSubmittable(Questionnaire q) {
        // example, adapt to your model:
        if (!(q.getStatus() == QuestionnaireStatus.PUBLISHED || q.getStatus() == QuestionnaireStatus.LOCKED)) {
            throw new IllegalStateException("Questionnaire is not open for submissions: " + q.getStatus());
        }
    }

    private static Questionnaire getQuestionnaire(Hackathon hackathon) {
        Questionnaire questionnaire = hackathon.getQuestionnaire();

        if (questionnaire.getSource() != QuestionnaireSource.INTERNAL &&
                questionnaire.getStatus() != QuestionnaireStatus.PUBLISHED) {
            throw new IllegalStateException("Questionnaire is not published for hackathon: " + hackathon.getId());
        }
        return questionnaire;
    }


    /**
     * Validates that all CoreFieldKey keys are present in the questions JSON.
     * Assumes structure: { "sections": [ { "questions": [ { "key": "...", ... } ] } ] }
     */
    private void validateRequiredQuestions(JsonNode questionsJson) {
        if (questionsJson == null || !questionsJson.isObject()) {
            throw new IllegalArgumentException("Questionnaire JSON must be a non-null object");
        }

        Set<String> keysInJson = extractQuestionKeys(questionsJson);

        var missing = Arrays.stream(CoreFieldKey.values())
                .filter(core -> !keysInJson.contains(core.key()))
                .toList();

        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("Questionnaire is missing required questions: " + missing);
        }
    }

    private Set<String> extractQuestionKeys(JsonNode root) {
        Set<String> keys = new HashSet<>();

        JsonNode sections = root.get("sections");
        if (sections != null && sections.isArray()) {
            for (JsonNode section : sections) {
                JsonNode questions = section.get("questions");
                if (questions != null && questions.isArray()) {
                    for (JsonNode q : questions) {
                        JsonNode keyNode = q.get("key");
                        if (keyNode != null && keyNode.isTextual()) {
                            keys.add(keyNode.asText());
                        }
                    }
                }
            }
        }

        return keys;
    }

    public Questionnaire editQuestionnaire(Long hackathonId, Long questionnaireId, JsonNode questionsJson) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        Questionnaire questionnaire = getQuestionnaire(hackathon);

        if (questionnaire.getSource() != QuestionnaireSource.INTERNAL) {
            throw new IllegalStateException("Only INTERNAL questionnaires can be edited");
        }
        if (questionnaire.getStatus() == QuestionnaireStatus.LOCKED ||
                questionnaire.getStatus() == QuestionnaireStatus.PUBLISHED) {
            throw new IllegalStateException("LOCKED questionnaires cannot be edited");
        }

        validateRequiredQuestions(questionsJson);

        questionnaire.setQuestions(questionsJson);
        return questionnaireRepository.save(questionnaire);
    }
}
