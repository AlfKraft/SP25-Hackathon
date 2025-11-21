package com.example.hackathonbe.hackathon.repositories;

import com.example.hackathonbe.hackathon.model.Questionnaire;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuestionnaireRepository extends JpaRepository<Questionnaire, Long> {
}
