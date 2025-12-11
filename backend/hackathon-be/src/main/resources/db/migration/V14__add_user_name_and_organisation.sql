ALTER TABLE app_user
    ADD COLUMN first_name     VARCHAR(100),
    ADD COLUMN last_name      VARCHAR(100),
    ADD COLUMN organisation   VARCHAR(255);

-- Optional: try to backfill from display_name if you already have data
-- This is Postgres-specific and safe to skip if you have no users yet.

UPDATE app_user
SET first_name = split_part(display_name, ' ', 1),
    last_name = CASE
                    WHEN position(' ' IN display_name) > 0
                        THEN substring(display_name FROM position(' ' IN display_name) + 1)
                    ELSE display_name
        END
WHERE display_name IS NOT NULL
  AND first_name IS NULL
  AND last_name IS NULL;

-- You can enforce NOT NULL later if you want,
-- once you are sure all rows have values:
-- ALTER TABLE users
--   ALTER COLUMN first_name SET NOT NULL,
--   ALTER COLUMN last_name SET NOT NULL;
