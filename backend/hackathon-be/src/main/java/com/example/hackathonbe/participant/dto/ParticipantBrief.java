package com.example.hackathonbe.participant.dto;

import java.util.UUID;

public interface ParticipantBrief {
    Long getId();
    String getEmail();
    Integer getMotivation();
    String getRole();
    String getSkills(); // normalized "skill1;skill2"
    Integer getYearsExperience();
    String getFirstName();
    String getLastName();
}
