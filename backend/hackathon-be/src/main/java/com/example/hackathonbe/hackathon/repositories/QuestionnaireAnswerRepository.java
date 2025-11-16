package com.example.hackathonbe.hackathon.repositories;

import com.example.hackathonbe.hackathon.model.Questionnaire;
import com.example.hackathonbe.hackathon.model.QuestionnaireAnswer;
import com.example.hackathonbe.importing.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuestionnaireAnswerRepository extends JpaRepository<QuestionnaireAnswer, Long> {

    Optional<QuestionnaireAnswer> findByQuestionnaireAndParticipant(
            Questionnaire questionnaire,
            Participant participant
    );
}
