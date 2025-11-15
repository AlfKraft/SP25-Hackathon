package com.example.hackathonbe.admin.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;

public record HackathonCreateRequest(
        @NotBlank
        @Size(max = 255)
        String name,

        @NotBlank
        @Size(max = 5000)
        String description,

        @NotBlank
        @Size(max = 255)
        String location,

        @NotNull
        @FutureOrPresent
        LocalDate startDate,

        @NotNull
        @FutureOrPresent
        LocalDate endDate,

        boolean requireApproval,
        boolean allowTeamCreation,

        @Size(max = 1000)
        String bannerUrl,

        // optional, but if present should not be blank
        JsonNode questionnaire
) {}
