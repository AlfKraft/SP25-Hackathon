package com.example.hackathonbe.participant.dto;

import jakarta.validation.constraints.*;

import java.util.List;

public record ParticipantUpdateRequest(

        @NotNull
        @PositiveOrZero
        Long id,
        @NotBlank
        @Size(max = 100)
        String firstName,

        @NotBlank
        @Size(max = 100)
        String lastName,

        @Email
        @Size(max = 255)
        String email

) {}
