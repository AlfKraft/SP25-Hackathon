package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.HackathonStatus;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record HackathonUpdateRequest(
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
        LocalDateTime startDate,

        @NotNull
        LocalDateTime endDate,

        @NotNull
        HackathonStatus status
) {}
