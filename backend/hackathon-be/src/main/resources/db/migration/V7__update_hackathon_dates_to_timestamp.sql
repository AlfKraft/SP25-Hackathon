ALTER TABLE hackathon
ALTER COLUMN start_date TYPE TIMESTAMP USING start_date::timestamp,
    ALTER COLUMN end_date TYPE TIMESTAMP USING end_date::timestamp;