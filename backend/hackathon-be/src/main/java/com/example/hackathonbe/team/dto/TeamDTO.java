package com.example.hackathonbe.team.dto;

import com.example.hackathonbe.team.model.Team;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TeamDTO(
        UUID id,
        String name,
        Double score,
        UUID generationId,
        OffsetDateTime createdAt,
        List<TeamMemberDTO> members
) {
    public TeamDTO(Team t, List<TeamMemberDTO> ms) {
        this(
                t.getId(),
                t.getName(),
                t.getScore(),
                t.getGenerationId(),
                t.getCreatedAt(),
                ms
        );
    }
}
