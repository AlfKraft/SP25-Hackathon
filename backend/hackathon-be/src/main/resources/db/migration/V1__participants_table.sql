CREATE TABLE IF NOT EXISTS participants (
                                            id BIGSERIAL PRIMARY KEY,
                                            email TEXT NOT NULL,
                                            first_name TEXT NOT NULL,
                                            last_name TEXT NOT NULL,
                                            data JSONB NOT NULL,
                                            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

ALTER TABLE participants
    ADD CONSTRAINT ux_participants_email UNIQUE (email);