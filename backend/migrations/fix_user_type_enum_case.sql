-- Migration: Fix user_type enum to use uppercase values
-- Date: 2026-01-18
-- Purpose: Match Python enum case (REGULAR, GOVT_AGENT, SUPER_ADMIN)

-- Drop the existing enum and recreate with uppercase values
ALTER TABLE users ALTER COLUMN user_type DROP DEFAULT;
ALTER TABLE users ALTER COLUMN user_type TYPE VARCHAR(20);

DROP TYPE IF EXISTS usertype;

CREATE TYPE usertype AS ENUM ('REGULAR', 'GOVT_AGENT', 'SUPER_ADMIN');

-- Convert existing data to uppercase
UPDATE users SET user_type = UPPER(user_type);

-- Change column back to enum type
ALTER TABLE users ALTER COLUMN user_type TYPE usertype USING user_type::usertype;
ALTER TABLE users ALTER COLUMN user_type SET DEFAULT 'REGULAR';
