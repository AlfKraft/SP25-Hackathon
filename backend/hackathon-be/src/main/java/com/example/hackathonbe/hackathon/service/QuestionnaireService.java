package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.hackathon.dto.SubmitQuestionnaireAnswersDto;
import com.example.hackathonbe.hackathon.model.*;
import com.example.hackathonbe.hackathon.repositories.HackathonRepository;
import com.example.hackathonbe.hackathon.repositories.QuestionnaireAnswerRepository;
import com.example.hackathonbe.hackathon.repositories.QuestionnaireRepository;
import com.example.hackathonbe.importing.model.Participant;
import com.example.hackathonbe.participant.repository.ParticipantRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Service
public class QuestionnaireService {

    private final QuestionnaireRepository questionnaireRepository;
    private final HackathonRepository hackathonRepository;
    private final ParticipantRepository participantRepository;
    private final QuestionnaireAnswerRepository questionnaireAnswerRepository;

    public QuestionnaireService(QuestionnaireRepository questionnaireRepository,
                                HackathonRepository hackathonRepository,
                                ParticipantRepository participantRepository,
                                QuestionnaireAnswerRepository questionnaireAnswerRepository) {
        this.questionnaireRepository = questionnaireRepository;
        this.hackathonRepository = hackathonRepository;
        this.participantRepository = participantRepository;
        this.questionnaireAnswerRepository = questionnaireAnswerRepository;
    }

    /**
     * Create or replace an INTERNAL questionnaire JSON for a given hackathon.
     * Used by your own questionnaire builder.
     */
    @Transactional
    public Questionnaire saveInternalQuestionnaire(Long hackathonId, JsonNode questionsJson) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));

        //validateRequiredQuestions(questionsJson);

        Questionnaire questionnaire = new Questionnaire();
        questionnaire.setSource(QuestionnaireSource.INTERNAL);
        questionnaire.setStatus(QuestionnaireStatus.DRAFT);
        questionnaire.setQuestions(questionsJson);
        hackathon.setQuestionnaire(questionnaire);
        hackathonRepository.save(hackathon);

        return hackathon.getQuestionnaire();
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
    public JsonNode getQuestionsForHackathon(Long hackathonId) {

        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        return hackathon.getQuestionnaire().getQuestions();
    }

    @Transactional
    public Questionnaire publishInternalQuestionnaire(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        Questionnaire q = hackathon.getQuestionnaire();
        if (q.getSource() != QuestionnaireSource.INTERNAL) {
            throw new IllegalStateException("Only INTERNAL questionnaires can be published");
        }

        validateRequiredQuestions(q.getQuestions());

        q.setStatus(QuestionnaireStatus.PUBLISHED);
        return questionnaireRepository.save(q);
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

    public void submitAnswers(Long hackathonId, SubmitQuestionnaireAnswersDto dto) {
        // 1. Resolve questionnaire by hackathonId
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new IllegalArgumentException("Hackathon not found: " + hackathonId));
        // 2. Resolve participant by participantId
        Participant participant = participantRepository.findById(dto.getParticipantId())
                .orElseThrow(() -> new IllegalArgumentException("Participant not found: " + dto.getParticipantId()));
        // 3. Validate questionnaire is public (PUBLISHED/LOCKED)
        Questionnaire questionnaire = getQuestionnaire(hackathonId, dto.questionnaireId(), hackathon);
        // 4. Create or update QuestionnaireAnswer (one per questionnaire+participant)
        QuestionnaireAnswer answer = questionnaireAnswerRepository
                .findByQuestionnaireAndParticipant(questionnaire, participant)
                .orElseGet(() -> {
                    QuestionnaireAnswer qa = new QuestionnaireAnswer();
                    qa.setQuestionnaire(questionnaire);
                    qa.setParticipant(participant);
                    return qa;
                });

        answer.setData(dto.answers());
        // 5. Save via QuestionnaireAnswerRepository
        questionnaireAnswerRepository.save(answer);
    }

    private static Questionnaire getQuestionnaire(Long hackathonId, Long questionnaireId, Hackathon hackathon) {
        Questionnaire questionnaire = hackathon.getQuestionnaire();
        if (!questionnaire.getId().equals(questionnaireId)) {
            throw new IllegalArgumentException("Questionnaire does not belong to hackathon: " + hackathonId);
        }
        if (questionnaire.getSource() != QuestionnaireSource.INTERNAL &&
                questionnaire.getStatus() != QuestionnaireStatus.PUBLISHED) {
            throw new IllegalStateException("Questionnaire is not published for hackathon: " + hackathonId);
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
        Questionnaire questionnaire = getQuestionnaire(hackathonId, questionnaireId, hackathon);

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
