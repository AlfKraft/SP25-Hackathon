package com.example.hackathonbe.team.dto;

import com.example.hackathonbe.team.model.TeamMember;

public record TeamMemberDTO(Long participantId, String role, String skills, Integer motivation, Integer yearsExperience) {
    public TeamMemberDTO(TeamMember m) {
        this(m.getParticipantId(), m.getRoleSnapshot(), m.getSkillsSnapshot(), m.getMotivationSnapshot(), m.getYearsExperienceSnapshot());
    }
}
