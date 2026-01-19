-- Migration: Add user_type to users table and create gov_authorities table
-- Date: 2026-01-18
-- Purpose: Support government authorities with location-based alert notifications

-- Create user_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usertype') THEN
        CREATE TYPE usertype AS ENUM ('regular', 'govt_agent', 'super_admin');
    END IF;
END$$;

-- Add user_type column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type usertype DEFAULT 'regular' NOT NULL;

-- Create index on user_type
CREATE INDEX IF NOT EXISTS ix_users_user_type ON users(user_type);

-- Add comment
COMMENT ON COLUMN users.user_type IS 'Type of user: regular, govt_agent, or super_admin';

-- Create gov_authorities table
CREATE TABLE IF NOT EXISTS gov_authorities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL,
    phone VARCHAR NOT NULL,
    email VARCHAR,
    department VARCHAR,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_gov_authorities_user_id ON gov_authorities(user_id);
CREATE INDEX IF NOT EXISTS ix_gov_authorities_is_active ON gov_authorities(is_active);

-- Add comments
COMMENT ON TABLE gov_authorities IS 'Government authorities with geographic jurisdiction for receiving alerts';
COMMENT ON COLUMN gov_authorities.user_id IS 'Foreign key to users table (govt agent account)';
COMMENT ON COLUMN gov_authorities.name IS 'Authority name (e.g., Mumbai Police West Division)';
COMMENT ON COLUMN gov_authorities.latitude IS 'Center point latitude for jurisdiction';
COMMENT ON COLUMN gov_authorities.longitude IS 'Center point longitude for jurisdiction';
COMMENT ON COLUMN gov_authorities.radius_meters IS 'Jurisdiction radius in meters';
COMMENT ON COLUMN gov_authorities.phone IS 'Contact phone number in E.164 format';
COMMENT ON COLUMN gov_authorities.email IS 'Contact email address';
COMMENT ON COLUMN gov_authorities.department IS 'Department/division name (Police, Fire, Medical, etc.)';
COMMENT ON COLUMN gov_authorities.is_active IS 'Whether authority should receive alerts';
