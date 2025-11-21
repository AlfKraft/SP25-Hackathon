package com.example.hackathonbe.participant.dto;

import java.util.UUID;

public record ParticipantBrief(
        Long id,
        String firstName,
        String lastName,
        String email,
        Integer motivation,
        String role,
        String skills,
        Integer yearsExperience
) {}
