#!/bin/bash

# Protego Database Setup Script
# This script sets up PostgreSQL for Protego

set -e  # Exit on any error

echo "=========================================="
echo "  Protego Database Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -e "${YELLOW}→ Checking PostgreSQL status...${NC}"
if ! systemctl is-active --quiet postgresql; then
    echo -e "${YELLOW}→ PostgreSQL is not running. Starting it...${NC}"
    sudo systemctl start postgresql
    sleep 2
fi

if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
    exit 1
fi

# Create database and user - try multiple methods for Fedora
echo ""
echo -e "${YELLOW}→ Creating database and user...${NC}"

# Method 1: Try using peer authentication by switching to postgres user
if sudo su - postgres -c "psql -c 'SELECT 1'" &>/dev/null; then
    echo -e "${GREEN}✓ Using peer authentication${NC}"
    sudo su - postgres <<'PGEOF'
psql <<EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'Protego') THEN
        CREATE USER Protego WITH PASSWORD 'Protego0305';
        RAISE NOTICE 'User Protego created';
    ELSE
        RAISE NOTICE 'User Protego already exists';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE protego OWNER Protego'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'protego')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE protego TO Protego;

-- Connect to protego database and grant schema privileges
\c protego
GRANT ALL ON SCHEMA public TO Protego;

EOF
PGEOF
else
    echo -e "${RED}✗ Could not connect to PostgreSQL${NC}"
    echo -e "${YELLOW}Attempting alternative method...${NC}"
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Database setup completed successfully!${NC}"
    echo ""
    echo "Database details:"
    echo "  - Database: protego"
    echo "  - User: Protego"
    echo "  - Password: Protego0305"
    echo "  - Host: localhost"
    echo "  - Port: 5432"
    echo ""
    echo "Connection string:"
    echo "  postgresql://Protego:Protego0305@localhost:5432/protego"
    echo ""
    echo -e "${GREEN}You can now run: python3 runner.py${NC}"
else
    echo -e "${RED}✗ Database setup failed${NC}"
    exit 1
fi
