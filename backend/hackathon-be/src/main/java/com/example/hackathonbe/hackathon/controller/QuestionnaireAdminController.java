package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.ParticipantAnswerDto;
import com.example.hackathonbe.hackathon.dto.PublishDto;
import com.example.hackathonbe.hackathon.dto.QuestionnaireDto;
import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.service.QuestionnaireService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/hackathons/{hackathonId}/questionnaire")
@RequiredArgsConstructor
public class QuestionnaireAdminController {

    private final QuestionnaireService questionnaireService;

    /**
     * Create or replace INTERNAL questionnaire JSON for a hackathon.
     * Called from your own questionnaire builder UI.
     */
    @PutMapping("/internal")
    public ResponseEntity<QuestionnaireDto> saveInternal(
            @PathVariable Long hackathonId,
            @RequestBody JsonNode questionsJson
    ) {
        return ResponseEntity.ok(questionnaireService.saveInternalQuestionnaire(hackathonId, questionsJson));
    }

    /**
     * Publish an INTERNAL questionnaire (after validation).
     * After publishing you can treat structure as immutable.
     */
    @PostMapping("/publish")
    public ResponseEntity<PublishDto> publishInternal(@PathVariable Long hackathonId) {
        return ResponseEntity.ok(questionnaireService.publishInternalQuestionnaire(hackathonId));
    }

    /**
     * Get the current questionnaire JSON for this hackathon (admin view).
     */
    @GetMapping
    public ResponseEntity<QuestionnaireDto> getForHackathon(@PathVariable Long hackathonId) {
        return ResponseEntity.ok(questionnaireService.getQuestionsForHackathon(hackathonId));
    }

    @PostMapping("/edit/{questionnaireId}")
    public ResponseEntity<JsonNode> editQuestionnaire(
            @PathVariable Long hackathonId,
            @PathVariable Long questionnaireId,
            @RequestBody JsonNode questionsJson
    ) {
        Questionnaire q = questionnaireService.editQuestionnaire(hackathonId, questionnaireId, questionsJson);
        return ResponseEntity.ok(q.getQuestions());
    }

    /**
     * Get all submitted answers for this hackathon's questionnaire.
     * Returns participant info along with their answer data.
     */
    @GetMapping("/answers")
    public ResponseEntity<List<ParticipantAnswerDto>> getAllAnswers(@PathVariable Long hackathonId) {
        return ResponseEntity.ok(questionnaireService.getAllAnswers(hackathonId));
    }
}