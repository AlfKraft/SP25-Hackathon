package com.example.hackathonbe.teams.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "team")
@Data
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;

    private Double score;

    private UUID generationId; // to group one “run”

    @Column(nullable = false, columnDefinition = "timestamptz")
    private OffsetDateTime createdAt = OffsetDateTime.now();
}