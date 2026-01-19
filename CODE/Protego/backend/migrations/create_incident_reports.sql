-- Migration: Create incident reports table
-- Date: 2026-01-18
-- Purpose: Add incident reporting feature for public incident reports

-- Create incident type enum
CREATE TYPE incidenttype AS ENUM (
    'THEFT',
    'ASSAULT',
    'HARASSMENT',
    'ACCIDENT',
    'SUSPICIOUS_ACTIVITY',
    'VANDALISM',
    'MEDICAL_EMERGENCY',
    'FIRE',
    'OTHER'
);

-- Create incident status enum
CREATE TYPE incidentstatus AS ENUM (
    'SUBMITTED',
    'REVIEWING',
    'ASSIGNED',
    'RESOLVED',
    'CLOSED'
);

-- Create incident_reports table
CREATE TABLE incident_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_type incidenttype NOT NULL,
    status incidentstatus NOT NULL DEFAULT 'SUBMITTED',

    -- Incident details
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,

    -- Location
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    location_address VARCHAR,

    -- Media files
    media_files TEXT[] DEFAULT '{}',

    -- Witness information
    witness_name VARCHAR,
    witness_phone VARCHAR,

    -- Privacy
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,

    -- Authority assignment
    assigned_authority_id INTEGER REFERENCES gov_authorities(id) ON DELETE SET NULL,
    authority_notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_incident_reports_user_id ON incident_reports(user_id);
CREATE INDEX idx_incident_reports_incident_type ON incident_reports(incident_type);
CREATE INDEX idx_incident_reports_status ON incident_reports(status);
CREATE INDEX idx_incident_reports_location_lat ON incident_reports(location_lat);
CREATE INDEX idx_incident_reports_location_lng ON incident_reports(location_lng);
CREATE INDEX idx_incident_reports_assigned_authority_id ON incident_reports(assigned_authority_id);
CREATE INDEX idx_incident_reports_created_at ON incident_reports(created_at);
