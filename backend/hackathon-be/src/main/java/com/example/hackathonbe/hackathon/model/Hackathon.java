package com.example.hackathonbe.hackathon.model;
import com.example.hackathonbe.auth.model.User;
import com.example.hackathonbe.participant.model.Participant;
import com.example.hackathonbe.team.model.Team;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "hackathon")
@Getter
@Setter
@NoArgsConstructor
public class Hackathon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String slug;
    private String description;
    private String location;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    private HackathonStatus status;

    private boolean requireApproval;
    private boolean allowTeamCreation;

    private String bannerUrl;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "questionnaire_id")
    private Questionnaire questionnaire;

    private Instant createdAt;
    private Instant updatedAt;

    // 🔽 CHANGED: Many-to-many via join table, no mappedBy
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
            name = "hackathon_participants",
            joinColumns = @JoinColumn(name = "hackathon_id"),
            inverseJoinColumns = @JoinColumn(name = "participant_id")
    )
    private Set<Participant> participants = new HashSet<>();


    @OneToMany(mappedBy = "hackathon",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
    private Set<Team> teams = new HashSet<>();

    @ManyToOne
    User owner;


    public void addTeam(Team team) {
        teams.add(team);
        team.setHackathon(this);
    }

    public void removeTeam(Team team) {
        teams.remove(team);
        team.setHackathon(null);
    }

    public void addParticipant(Participant p) {
        this.participants.add(p);
        p.getHackathons().add(this);
    }
}

