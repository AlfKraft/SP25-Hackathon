package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.participant.model.Participant;
import com.fasterxml.jackson.databind.JsonNode;

public record ParticipantAnswerDto(
        Long participantId,
        String email,
        String firstName,
        String lastName,
        JsonNode answers
) {

    public static ParticipantAnswerDto from(QuestionnaireAnswer qa, JsonNode resolvedAnswers) {
        if (qa == null) return null;

        Participant participant = qa.getParticipant();
        if (participant == null) return null;

        return new ParticipantAnswerDto(
                participant.getId(),
                participant.getEmail(),
                participant.getFirstName(),
                participant.getLastName(),
                resolvedAnswers
        );
    }
}
