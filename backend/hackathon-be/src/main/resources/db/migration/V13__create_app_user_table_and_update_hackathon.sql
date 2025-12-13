CREATE TABLE app_user (
                          id              BIGSERIAL PRIMARY KEY,
                          email           VARCHAR(255) NOT NULL UNIQUE,
                          password_hash   VARCHAR(255),                 -- nullable for Google-only accounts
                          display_name    VARCHAR(255),
                          auth_provider   VARCHAR(50) NOT NULL,         -- 'LOCAL' or 'GOOGLE'
                          role            VARCHAR(50) NOT NULL,         -- 'ORGANIZER', 'ADMIN', ...
                          active          BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE hackathon
    ADD COLUMN owner_id BIGINT;

ALTER TABLE hackathon
    ADD CONSTRAINT fk_hackathon_owner
        FOREIGN KEY (owner_id)
            REFERENCES app_user (id)
            ON DELETE SET NULL;

