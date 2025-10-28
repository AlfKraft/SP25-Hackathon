package com.example.hackathonbe.dto;

import com.example.hackathonbe.teams.model.TeamMember;

import java.util.UUID;

public record TeamMemberDTO(Long participantId, String role, String skills, Integer motivation, Integer yearsExperience) {
    public TeamMemberDTO(TeamMember m) {
        this(m.getParticipantId(), m.getRoleSnapshot(), m.getSkillsSnapshot(), m.getMotivationSnapshot(), m.getYearsExperienceSnapshot());
    }
}
