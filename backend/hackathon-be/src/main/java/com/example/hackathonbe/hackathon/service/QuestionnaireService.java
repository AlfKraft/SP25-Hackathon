package com.example.hackathonbe.hackathon.service;

import com.example.hackathonbe.common.exceptions.BadRequestException;
import com.example.hackathonbe.common.exceptions.ConflictException;
import com.example.hackathonbe.common.exceptions.NotFoundException;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class QuestionnaireService {

    private final QuestionnaireRepository questionnaireRepository;
    private final HackathonRepository hackathonRepository;
    private final ParticipantRepository participantRepository;
    private final QuestionnaireAnswerRepository questionnaireAnswerRepository;

    public QuestionnaireService(
            QuestionnaireRepository questionnaireRepository,
            HackathonRepository hackathonRepository,
            ParticipantRepository participantRepository,
            QuestionnaireAnswerRepository questionnaireAnswerRepository
    ) {
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
    public QuestionnaireDto saveInternalQuestionnaire(Long hackathonId, JsonNode questionsJson) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        if (questionsJson == null || !questionsJson.isObject()) {
            throw new BadRequestException("Questionnaire JSON must be a non-null object");
        }

        Questionnaire existing = hackathon.getQuestionnaire();

        // Prevent overwriting external uploads with internal builder
        if (existing != null && existing.getSource() == QuestionnaireSource.EXTERNAL_UPLOAD) {
            throw new ConflictException(
                    "External questionnaire already exists for hackathon: " + hackathonId +
                            " (questionnaireId=" + existing.getId() + ")"
            );
        }

        Questionnaire questionnaire;
        if (existing != null && existing.getSource() == QuestionnaireSource.INTERNAL) {
            questionnaire = existing;
        } else {
            questionnaire = new Questionnaire();
            questionnaire.setSource(QuestionnaireSource.INTERNAL);
        }

        // Optional: enforce required questions for internal builder
        // validateRequiredQuestions(questionsJson);

        questionnaire.setStatus(QuestionnaireStatus.DRAFT);
        questionnaire.setQuestions(questionsJson);

        hackathon.setQuestionnaire(questionnaire);
        hackathonRepository.save(hackathon);

        return toDto(hackathon);
    }

    /**
     * Create or update a LOCKED questionnaire from an external upload (e.g. CSV/XLSX import).
     * Caller is responsible for building the JSON structure.
     */
    @Transactional
    public Questionnaire saveExternalQuestionnaire(Hackathon hackathon, JsonNode questionsJson) {
        if (hackathon == null) {
            throw new BadRequestException("Hackathon cannot be null");
        }
        if (hackathon.getId() == null) {
            throw new BadRequestException("Hackathon must be persisted before adding a questionnaire");
        }
        if (questionsJson == null || !questionsJson.isObject()) {
            throw new BadRequestException("Questionnaire JSON must be a non-null object");
        }

        Questionnaire questionnaire = hackathon.getQuestionnaire();
        if (questionnaire == null) {
            questionnaire = new Questionnaire();
        }

        questionnaire.setSource(QuestionnaireSource.EXTERNAL_UPLOAD);
        questionnaire.setStatus(QuestionnaireStatus.LOCKED);
        questionnaire.setQuestions(questionsJson);

        hackathon.setQuestionnaire(questionnaire);
        hackathonRepository.save(hackathon);

        return hackathon.getQuestionnaire();
    }

    /**
     * Admin/editor fetch. Returns the questionnaire "questions" array node.
     * (Your FE expects either Question[] or { questions: Question[] }, you wrap into QuestionnaireDto.)
     */
    @Transactional(readOnly = true)
    public QuestionnaireDto getQuestionsForHackathon(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        if (hackathon.getQuestionnaire() == null) {
            throw new NotFoundException("Questionnaire not found for hackathon: " + hackathonId);
        }

        return toDto(hackathon);
    }

    /**
     * Publish/unpublish INTERNAL questionnaire.
     * DRAFT <-> PUBLISHED only.
     */
    @Transactional
    public PublishDto publishInternalQuestionnaire(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        Questionnaire q = hackathon.getQuestionnaire();
        if (q == null) {
            throw new NotFoundException("Questionnaire not found for hackathon: " + hackathonId);
        }

        if (q.getSource() != QuestionnaireSource.INTERNAL) {
            throw new BadRequestException("Only INTERNAL questionnaires can be published");
        }

        if (q.getStatus() == QuestionnaireStatus.PUBLISHED) {
            q.setStatus(QuestionnaireStatus.DRAFT);
        } else if (q.getStatus() == QuestionnaireStatus.DRAFT) {
            q.setStatus(QuestionnaireStatus.PUBLISHED);
        } else {
            // e.g. LOCKED should never occur for INTERNAL, but if it does, treat as conflict
            throw new ConflictException("Questionnaire is not in a valid state for publishing: " + q.getStatus());
        }

        questionnaireRepository.save(q);
        return new PublishDto(q.getId(), q.getStatus());
    }

    /**
     * Public fetch:
     * - INTERNAL must be PUBLISHED
     * - EXTERNAL_UPLOAD is always exposed (LOCKED)
     */
    @Transactional(readOnly = true)
    public JsonNode getPublicQuestionnaire(Long hackathonId) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        Questionnaire q = hackathon.getQuestionnaire();
        if (q == null) {
            throw new NotFoundException("Questionnaire not found for hackathon: " + hackathonId);
        }

        if (q.getSource() == QuestionnaireSource.INTERNAL && q.getStatus() != QuestionnaireStatus.PUBLISHED) {
            throw new BadRequestException("Questionnaire is not published for hackathon: " + hackathonId);
        }
        if (q.getSource() == QuestionnaireSource.EXTERNAL_UPLOAD) {
            throw new BadRequestException("External don't have internal questionnaires to fill");
        }

        return q.getQuestions();
    }

    /**
     * Submit answers for the hackathon questionnaire.
     * - Questionnaire must be PUBLISHED (internal) or LOCKED (external upload)
     * - Requires email, first_name, last_name
     * - Upserts QuestionnaireAnswer per (questionnaire + participant)
     */
    @Transactional
    public void submitAnswers(Long hackathonId, SubmitQuestionnaireAnswersDto dto) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        Questionnaire questionnaire = requireQuestionnaire(hackathon);
        validateQuestionnaireIsSubmittable(questionnaire, hackathonId);

        JsonNode answersNode = dto.answers();
        if (answersNode == null || !answersNode.isArray()) {
            throw new BadRequestException("answers must be an array");
        }

        Map<String, JsonNode> byKey = toAnswerMap(answersNode);

        String email = requireText(byKey, "email");
        String firstName = requireText(byKey, "first_name");
        String lastName = requireText(byKey, "last_name");

        Participant participant = participantRepository.findByEmail(email)
                .orElseGet(() -> {
                    Participant p = new Participant();
                    p.setEmail(email);
                    p.setFirstName(firstName);
                    p.setLastName(lastName);
                    return participantRepository.save(p);
                });

        // Ensure participant registered to hackathon
        if (!hackathon.getParticipants().contains(participant)) {
            hackathon.addParticipant(participant);
            hackathonRepository.save(hackathon);
        }

        QuestionnaireAnswer qa = questionnaireAnswerRepository
                .findByQuestionnaireAndParticipant(questionnaire, participant)
                .orElseGet(() -> {
                    QuestionnaireAnswer fresh = new QuestionnaireAnswer();
                    fresh.setQuestionnaire(questionnaire);
                    fresh.setParticipant(participant);
                    return fresh;
                });

        qa.setData(answersNode);
        questionnaireAnswerRepository.save(qa);
    }

    /**
     * Edit INTERNAL questionnaire in DRAFT only.
     */
    @Transactional
    public Questionnaire editQuestionnaire(Long hackathonId, Long questionnaireId, JsonNode questionsJson) {
        Hackathon hackathon = hackathonRepository.findById(hackathonId)
                .orElseThrow(() -> new NotFoundException("Hackathon not found: " + hackathonId));

        Questionnaire questionnaire = requireQuestionnaire(hackathon);

        // Ensure the path id matches the hackathon questionnaire
        if (questionnaire.getId() == null || !questionnaire.getId().equals(questionnaireId)) {
            throw new NotFoundException(
                    "Questionnaire not found: " + questionnaireId + " for hackathon: " + hackathonId
            );
        }

        if (questionnaire.getSource() != QuestionnaireSource.INTERNAL) {
            throw new BadRequestException("Only INTERNAL questionnaires can be edited");
        }

        if (questionnaire.getStatus() == QuestionnaireStatus.LOCKED || questionnaire.getStatus() == QuestionnaireStatus.PUBLISHED) {
            throw new ConflictException("Questionnaire cannot be edited in status: " + questionnaire.getStatus());
        }

        if (questionsJson == null || !questionsJson.isObject()) {
            throw new BadRequestException("Questionnaire JSON must be a non-null object");
        }

        // Optional but recommended:
        // validateRequiredQuestions(questionsJson);

        questionnaire.setQuestions(questionsJson);
        return questionnaireRepository.save(questionnaire);
    }

    // -------------------------
    // Helpers
    // -------------------------

    private QuestionnaireDto toDto(Hackathon hackathon) {
        Questionnaire q = hackathon.getQuestionnaire();
        boolean isLocked = q.getStatus() == QuestionnaireStatus.LOCKED;

        JsonNode questionsArray = null;
        if (q.getQuestions() != null) {
            questionsArray = q.getQuestions().get("questions"); // your current JSON shape
        }

        return new QuestionnaireDto(
                q.getId(),
                hackathon.getId(),
                q.getSource(),
                isLocked,
                q.getStatus(),
                questionsArray
        );
    }

    private Questionnaire requireQuestionnaire(Hackathon hackathon) {
        Questionnaire q = hackathon.getQuestionnaire();
        if (q == null) {
            throw new NotFoundException("Questionnaire not found for hackathon: " + hackathon.getId());
        }
        return q;
    }

    private void validateQuestionnaireIsSubmittable(Questionnaire q, Long hackathonId) {
        // Internal submissions only allowed when published
        if (q.getSource() == QuestionnaireSource.INTERNAL) {
            if (q.getStatus() != QuestionnaireStatus.PUBLISHED) {
                throw new ConflictException("Questionnaire is not open for submissions for hackathon: " + hackathonId);
            }
            return;
        }

        // External upload submissions allowed when locked (your design)
        if (q.getSource() == QuestionnaireSource.EXTERNAL_UPLOAD) {
            if (q.getStatus() != QuestionnaireStatus.LOCKED) {
                throw new ConflictException("External questionnaire is not locked (invalid state): " + q.getStatus());
            }
            return;
        }

        throw new BadRequestException("Unknown questionnaire source: " + q.getSource());
    }

    /** Convert answers array into key -> answerNode. */
    private Map<String, JsonNode> toAnswerMap(JsonNode answersArray) {
        Map<String, JsonNode> map = new HashMap<>();
        for (JsonNode a : answersArray) {
            String key = a.path("key").asText(null);
            if (key == null || key.isBlank()) continue;
            map.put(key, a); // last wins
        }
        return map;
    }

    /** Extract valueText (trimmed) and enforce presence. */
    private String requireText(Map<String, JsonNode> byKey, String key) {
        JsonNode node = byKey.get(key);
        if (node == null) {
            throw new BadRequestException("Missing required answer: " + key);
        }
        String value = node.path("valueText").asText("").trim();
        if (value.isBlank()) {
            throw new BadRequestException("Missing required answer: " + key);
        }
        return value;
    }
}
