ALTER TABLE questionnaire_answers
DROP CONSTRAINT IF EXISTS fk_questionnaire_answers_questionnaire;

ALTER TABLE questionnaire_answers
    ADD CONSTRAINT fk_questionnaire_answers_questionnaire
        FOREIGN KEY (questionnaire_id)
            REFERENCES questionnaire(id)
            ON DELETE CASCADE;

ALTER TABLE hackathon
DROP CONSTRAINT IF EXISTS fk_hackathon_questionnaire;

ALTER TABLE hackathon
    ADD CONSTRAINT fk_hackathon_questionnaire
        FOREIGN KEY (questionnaire_id)
            REFERENCES questionnaire(id)
            ON DELETE CASCADE;