-- Add generation_id to team_member, mirroring team.generation_id
ALTER TABLE team_member
    ADD COLUMN IF NOT EXISTS generation_id UUID;

-- Backfill from team
UPDATE team_member tm
SET generation_id = t.generation_id
    FROM team t
WHERE tm.team_id = t.id
  AND tm.generation_id IS NULL;

ALTER TABLE team_member
    ALTER COLUMN generation_id SET NOT NULL;

-- Optional index for performance
CREATE INDEX IF NOT EXISTS idx_team_member_generation
    ON team_member (generation_id);

-- Enforce: one team per participant per generation
ALTER TABLE team_member
    ADD CONSTRAINT uq_team_member_generation_participant
        UNIQUE (generation_id, participant_id);
