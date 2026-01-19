-- Protego Database Initialization Script
-- This script runs automatically when the PostgreSQL container is first created

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database user if not exists (optional, Docker handles this)
-- DO
-- $$
-- BEGIN
--   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'protego') THEN
--     CREATE ROLE protego WITH LOGIN PASSWORD 'protego_secure_password';
--   END IF;
-- END
-- $$;

-- Grant privileges
-- GRANT ALL PRIVILEGES ON DATABASE protego TO protego;

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'Protego database initialized successfully';
END
$$;
