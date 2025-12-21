package com.example.hackathonbe.team.dto;

import com.example.hackathonbe.participant.dto.ParticipantDto;
import com.example.hackathonbe.team.model.TeamMember;

public record TeamMemberDTO(
        ParticipantDto participant,
        String role,
        String skills,
        Integer motivation,
        Integer yearsExperience
) {
    public TeamMemberDTO(TeamMember m, ParticipantDto p) {
        this(
                p,
                m.getRoleSnapshot(),
                m.getSkillsSnapshot(),
                m.getMotivationSnapshot(),
                m.getYearsExperienceSnapshot()
        );
    }
}
