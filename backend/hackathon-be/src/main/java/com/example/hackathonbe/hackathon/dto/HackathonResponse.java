package com.example.hackathonbe.hackathon.dto;

import com.example.hackathonbe.hackathon.model.Hackathon;
import com.example.hackathonbe.hackathon.model.HackathonStatus;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.time.LocalDate;

public record HackathonResponse(
        Long id,
        String name,
        String slug,
        String description,
        String location,
        LocalDate startDate,
        LocalDate endDate,
        HackathonStatus status,
        boolean requireApproval,
        boolean allowTeamCreation,
        String bannerUrl,
        JsonNode questionnaire,
        Instant createdAt,
        Instant updatedAt
) {
    public static HackathonResponse fromEntity(Hackathon h) {
        return new HackathonResponse(
                h.getId(),
                h.getName(),
                h.getSlug(),
                h.getDescription(),
                h.getLocation(),
                h.getStartDate(),
                h.getEndDate(),
                h.getStatus(),
                h.isRequireApproval(),
                h.isAllowTeamCreation(),
                h.getBannerUrl(),
                h.getQuestionnaire(),
                h.getCreatedAt(),
                h.getUpdatedAt()
        );
    }
}