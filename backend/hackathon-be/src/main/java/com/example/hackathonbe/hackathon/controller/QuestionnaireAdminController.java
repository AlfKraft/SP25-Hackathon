package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.service.QuestionnaireService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<JsonNode> saveInternal(
            @PathVariable Long hackathonId,
            @RequestBody JsonNode questionsJson
    ) {
        Questionnaire q = questionnaireService.saveInternalQuestionnaire(hackathonId, questionsJson);
        return ResponseEntity.ok(q.getQuestions());
    }

    /**
     * Publish an INTERNAL questionnaire (after validation).
     * After publishing you can treat structure as immutable.
     */
    @PostMapping("/publish")
    public ResponseEntity<Void> publishInternal(@PathVariable Long hackathonId) {
        questionnaireService.publishInternalQuestionnaire(hackathonId);
        return ResponseEntity.ok().build();
    }

    /**
     * Get the current questionnaire JSON for this hackathon (admin view).
     */
    @GetMapping
    public ResponseEntity<JsonNode> getForHackathon(@PathVariable Long hackathonId) {
        JsonNode json = questionnaireService.getQuestionsForHackathon(hackathonId);
        return ResponseEntity.ok(json);
    }
}