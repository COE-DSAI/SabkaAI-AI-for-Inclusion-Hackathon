-- Migration: Add end_latitude and end_longitude to walk_sessions table
-- Date: 2026-01-17
-- Purpose: Track ending location when user stops walk mode (for duress detection)

-- Add end_latitude column
ALTER TABLE walk_sessions
ADD COLUMN IF NOT EXISTS end_latitude DOUBLE PRECISION;

-- Add end_longitude column
ALTER TABLE walk_sessions
ADD COLUMN IF NOT EXISTS end_longitude DOUBLE PRECISION;

-- Add comment
COMMENT ON COLUMN walk_sessions.end_latitude IS 'Ending latitude when session stopped';
COMMENT ON COLUMN walk_sessions.end_longitude IS 'Ending longitude when session stopped';
