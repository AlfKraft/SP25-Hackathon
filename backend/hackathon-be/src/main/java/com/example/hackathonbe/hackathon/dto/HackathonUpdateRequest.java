package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.HackathonStatus;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

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
        LocalDate startDate,

        @NotNull
        LocalDate endDate,

        @NotNull
        HackathonStatus status
) {}
