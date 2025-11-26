CREATE TABLE questionnaire (
                               id            BIGSERIAL PRIMARY KEY,
                               source        VARCHAR(32) NOT NULL,
                               status        VARCHAR(32) NOT NULL,
                               questions     JSONB      NOT NULL
);

ALTER TABLE hackathon
    DROP COLUMN questionnaire;

ALTER TABLE hackathon
    ADD COLUMN questionnaire_id BIGINT;

ALTER TABLE hackathon
    ADD CONSTRAINT fk_hackathon_questionnaire
        FOREIGN KEY (questionnaire_id) REFERENCES questionnaire (id);