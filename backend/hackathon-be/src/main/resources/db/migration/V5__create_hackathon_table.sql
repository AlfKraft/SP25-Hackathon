CREATE TABLE hackathon (
                           id BIGSERIAL PRIMARY KEY,
                           name VARCHAR(255) NOT NULL,
                           slug VARCHAR(255) NOT NULL UNIQUE,
                           description TEXT,
                           location VARCHAR(255),
                           start_date DATE,
                           end_date DATE,
                           status VARCHAR(50) DEFAULT 'DRAFT',
                           require_approval BOOLEAN DEFAULT FALSE,
                           allow_team_creation BOOLEAN DEFAULT TRUE,
                           banner_url TEXT,
                           questionnaire JSONB,  -- stores dynamic questionnaire schema
                           created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                           updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hackathon_slug ON hackathon(slug);
CREATE INDEX idx_hackathon_status ON hackathon(status);
CREATE INDEX idx_hackathon_start_date ON hackathon(start_date);

