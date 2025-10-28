package com.example.hackathonbe.dto;

import com.example.hackathonbe.teams.model.Team;
import com.example.hackathonbe.teams.model.TeamMember;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TeamDTO(UUID id, String name, Double score, UUID generationId, OffsetDateTime createdAt, List<TeamMemberDTO> members) {
    public TeamDTO(Team t, List<TeamMember> ms) {
        this(t.getId(), t.getName(), t.getScore(), t.getGenerationId(), t.getCreatedAt(),
                ms.stream().map(TeamMemberDTO::new).toList());
    }
}