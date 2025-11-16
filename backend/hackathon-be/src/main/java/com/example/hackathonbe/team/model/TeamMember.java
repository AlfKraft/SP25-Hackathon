package com.example.hackathonbe.team.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Table(name = "team_member")
@Data
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID teamId;
    @Column(name = "participant_id", nullable = false)
    private Long participantId;

    private String roleSnapshot; // snapshot at generation time
    private String skillsSnapshot; // comma/semicolon string
    private Integer motivationSnapshot;
    private Integer yearsExperienceSnapshot;
}
