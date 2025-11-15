CREATE TABLE hackathon_participants (
                                        hackathon_id  BIGINT NOT NULL,
                                        participant_id BIGINT NOT NULL,
                                        PRIMARY KEY (hackathon_id, participant_id),
                                        CONSTRAINT fk_hackathon_participants_hackathon
                                            FOREIGN KEY (hackathon_id) REFERENCES hackathon (id) ON DELETE CASCADE,
                                        CONSTRAINT fk_hackathon_participants_participant
                                            FOREIGN KEY (participant_id) REFERENCES participants (id) ON DELETE CASCADE
);

-- Optional indexes (usually overkill because of PK, but nice if you query by participant a lot)
CREATE INDEX idx_hp_participant_id ON hackathon_participants (participant_id);
