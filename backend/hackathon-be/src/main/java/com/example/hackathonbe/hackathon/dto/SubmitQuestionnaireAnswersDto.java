package com.example.hackathonbe.hackathon.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;


public record SubmitQuestionnaireAnswersDto(
        @NotNull
        JsonNode answers

) {

}
