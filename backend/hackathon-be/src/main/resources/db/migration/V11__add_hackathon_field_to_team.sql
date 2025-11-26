

-- 1) Add column (nullable first if you need to backfill)
ALTER TABLE team
    ADD COLUMN hackathon_id BIGINT;

-- 2) Optionally backfill existing rows here if needed:
-- UPDATE teams SET hackathon_id = <some existing hackathon id> WHERE hackathon_id IS NULL;

-- 3) Make column NOT NULL once data is consistent
ALTER TABLE team
    ALTER COLUMN hackathon_id SET NOT NULL;

-- 4) Add foreign key constraint
ALTER TABLE team
    ADD CONSTRAINT fk_team_hackathon
        FOREIGN KEY (hackathon_id)
            REFERENCES hackathon (id)
            ON DELETE CASCADE;
