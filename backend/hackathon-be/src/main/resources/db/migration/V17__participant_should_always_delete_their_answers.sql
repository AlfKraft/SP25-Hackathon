ALTER TABLE questionnaire_answers
DROP CONSTRAINT fk_questionnaire_answers_participant;

ALTER TABLE questionnaire_answers
    ADD CONSTRAINT fk_questionnaire_answers_participant
        FOREIGN KEY (participant_id)
            REFERENCES participants(id)
            ON DELETE CASCADE;