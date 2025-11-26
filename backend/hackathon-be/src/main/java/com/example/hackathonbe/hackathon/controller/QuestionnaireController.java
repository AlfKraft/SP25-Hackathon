package com.example.hackathonbe.hackathon.controller;

import com.example.hackathonbe.hackathon.dto.SubmitQuestionnaireAnswersDto;
import com.example.hackathonbe.hackathon.service.QuestionnaireService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hackathons/{hackathonId}/questionnaire")
@RequiredArgsConstructor
public class QuestionnaireController {

    private final QuestionnaireService questionnaireService;

    /**
     * Public/participant-facing endpoint.
     * Returns questionnaire JSON only if it is published or external.
     */
    @GetMapping
    public ResponseEntity<JsonNode> getPublicQuestionnaire(@PathVariable Long hackathonId) {
        JsonNode json = questionnaireService.getPublicQuestionnaire(hackathonId);
        return ResponseEntity.ok(json);
    }

    @PostMapping("/submit")
    public ResponseEntity<Void> submitAnswers(
            @PathVariable Long hackathonId,
            @RequestBody SubmitQuestionnaireAnswersDto answers
    ) {
        questionnaireService.submitAnswers(hackathonId, answers);
        return ResponseEntity.ok().build();
    }


}