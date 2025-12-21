package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.example.hackathonbe.hackathon.model.QuestionnaireSource;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record HackathonResponse(
    Long id,
    String name,
    String description,
    String location,
    LocalDateTime startDate,
    LocalDateTime endDate,
    HackathonStatus status,
    QuestionnaireSource questionnaireSource,

    Integer participantCount

) {
    public static HackathonResponse fromEntity(Hackathon h) {
        return new HackathonResponse(
            h.getId(),
            h.getName(),
            h.getDescription(),
            h.getLocation(),
            h.getStartDate(),
            h.getEndDate(),
            h.getStatus(),
            h.getQuestionnaire().getSource(),
            h.getParticipants().size()
        );
    }
}
