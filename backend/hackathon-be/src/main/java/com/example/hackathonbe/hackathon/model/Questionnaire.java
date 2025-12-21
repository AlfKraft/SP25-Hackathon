package com.example.hackathonbe.hackathon.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "questionnaire")
@Data
@NoArgsConstructor
public class Questionnaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private QuestionnaireSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private QuestionnaireStatus status;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private JsonNode questions;

    @OneToMany(
            mappedBy = "questionnaire",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private Set<QuestionnaireAnswer> answers = new HashSet<>();
}
