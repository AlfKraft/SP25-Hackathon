package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.QuestionnaireStatus;

public record PublishDto (
        Long questionnaireId,
        QuestionnaireStatus status
){
}
