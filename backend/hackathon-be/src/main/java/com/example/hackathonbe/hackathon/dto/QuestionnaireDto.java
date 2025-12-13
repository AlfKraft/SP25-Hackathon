package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.QuestionnaireSource;
import com.example.hackathonbe.hackathon.model.QuestionnaireStatus;
import com.fasterxml.jackson.databind.JsonNode;

public record QuestionnaireDto (
        Long id,
        Long hackathonId,
        QuestionnaireSource sourceType,
        Boolean isLocked,
        QuestionnaireStatus status,
        JsonNode questions
){
    public QuestionnaireDto(Long id, Long hackathonId, QuestionnaireSource sourceType, Boolean isLocked, QuestionnaireStatus status, JsonNode questions) {
        this.id = id;
        this.hackathonId = hackathonId;
        this.sourceType = sourceType;
        this.isLocked = isLocked;
        this.status = status;
        this.questions = questions;
    }
}
