package com.example.hackathonbe.hackathon.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import org.checkerframework.common.value.qual.BoolVal;


public record SubmitQuestionnaireAnswersDto(
        @NotNull
        JsonNode answers,
        @NotNull
        Boolean consent

) {

}
