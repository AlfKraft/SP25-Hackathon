package com.example.hackathonbe.hackathon.repository;

import com.example.hackathonbe.hackathon.model.Questionnaire;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionnaireRepository extends JpaRepository<Questionnaire, Long> {
}
