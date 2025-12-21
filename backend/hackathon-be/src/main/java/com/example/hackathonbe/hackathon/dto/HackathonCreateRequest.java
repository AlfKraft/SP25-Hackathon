package com.example.hackathonbe.hackathon.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

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
        LocalDateTime startDate,

        @NotNull
        @FutureOrPresent
        LocalDateTime endDate,

        boolean requireApproval,
        boolean allowTeamCreation,

        @Size(max = 1000)
        String bannerUrl
) {}
