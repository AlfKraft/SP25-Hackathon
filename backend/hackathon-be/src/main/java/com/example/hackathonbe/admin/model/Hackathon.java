package com.example.hackathonbe.admin.model;
import com.example.hackathonbe.upload.model.Participant;
import com.fasterxml.jackson.databind.JsonNode;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "hackathon")
@Data
public class Hackathon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String slug;
    private String description;
    private String location;

    private LocalDate startDate;
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    private HackathonStatus status;

    private boolean requireApproval;
    private boolean allowTeamCreation;

    private String bannerUrl;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private JsonNode questionnaire;

    private Instant createdAt;
    private Instant updatedAt;

    // 🔽 CHANGED: Many-to-many via join table, no mappedBy
    @ManyToMany
    @JoinTable(
            name = "hackathon_participants",
            joinColumns = @JoinColumn(name = "hackathon_id"),
            inverseJoinColumns = @JoinColumn(name = "participant_id")
    )
    private Set<Participant> participants = new HashSet<>();
}

