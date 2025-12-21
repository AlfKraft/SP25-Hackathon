package com.example.hackathonbe.hackathon.model;

import com.example.hackathonbe.participant.model.Participant;
import com.fasterxml.jackson.databind.JsonNode;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Type;

@Getter
@Setter
@Entity
@Table(
        name = "questionnaire_answers",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_questionnaire_answer_per_participant",
                        columnNames = {"questionnaire_id", "participant_id"}
                )
        }
)
public class QuestionnaireAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Many answers (globally) to one questionnaire,
    // but each participant can only have ONE row per questionnaire
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "questionnaire_id", nullable = false)
    private Questionnaire questionnaire;

    // Each participant can answer many questionnaires across hackathons,
    // but only once per questionnaire (enforced by the unique constraint)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant;

    /**
     * Raw answer payload as JSON.
     *
     * IMPORTANT:
     *  - Copy the same JSON mapping annotations you currently use
     *    on Participant.data (e.g. @JdbcTypeCode(SqlTypes.JSON) or @Type(JsonType.class)).
     */
    @Type(JsonType.class)
    @Column(name = "data", nullable = false, columnDefinition = "jsonb")
    private JsonNode data;

    @Column(name = "consent", nullable = false)
    private boolean consent;

}
