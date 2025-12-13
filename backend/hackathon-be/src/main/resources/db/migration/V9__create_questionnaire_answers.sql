CREATE TABLE questionnaire_answers (
                                       id               BIGSERIAL PRIMARY KEY,
                                       questionnaire_id BIGINT  NOT NULL,
                                       participant_id   BIGINT  NOT NULL,
                                       data             JSONB   NOT NULL,

                                       CONSTRAINT fk_questionnaire_answers_questionnaire
                                           FOREIGN KEY (questionnaire_id)
                                               REFERENCES questionnaire (id),

                                       CONSTRAINT fk_questionnaire_answers_participant
                                           FOREIGN KEY (participant_id)
                                               REFERENCES participants (id),

                                       CONSTRAINT uq_questionnaire_answer_per_participant
                                           UNIQUE (questionnaire_id, participant_id)
);

CREATE INDEX idx_questionnaire_answers_questionnaire
    ON questionnaire_answers (questionnaire_id);

CREATE INDEX idx_questionnaire_answers_participant
    ON questionnaire_answers (participant_id);
