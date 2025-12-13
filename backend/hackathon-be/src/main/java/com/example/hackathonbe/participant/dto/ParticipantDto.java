package com.example.hackathonbe.participant.dto;

import com.example.hackathonbe.participant.model.Participant;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

public record ParticipantDto(
        Long id,
        String firstName,
        String lastName,
        String email
) {
    public ParticipantDto(Participant p) {
        this(
                p.getId(),
                p.getFirstName(),
                p.getLastName(),
                p.getEmail()
        );
    }
}
