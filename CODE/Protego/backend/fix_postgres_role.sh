#!/bin/bash

# Fix PostgreSQL Role Issue
# This script creates the "Protego" role if it doesn't exist

set -e

echo "==========================================
  Fixing PostgreSQL Role
=========================================="

# Database credentials from .env
DB_USER="Protego"
DB_PASS="Protego0305"
DB_NAME="protego"

echo ""
echo "→ Checking PostgreSQL status..."
if ! systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL is not running"
    echo "   Start it with: sudo systemctl start postgresql"
    exit 1
fi
echo "✓ PostgreSQL is running"

echo ""
echo "→ Creating role '$DB_USER' if it doesn't exist..."

# Try to create the role as postgres user
sudo -u postgres psql << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE "$DB_USER" WITH LOGIN PASSWORD '$DB_PASS';
        RAISE NOTICE 'Role $DB_USER created';
    ELSE
        -- Update password if role exists
        ALTER ROLE "$DB_USER" WITH PASSWORD '$DB_PASS';
        RAISE NOTICE 'Role $DB_USER already exists, password updated';
    END IF;
END
\$\$;

-- Grant necessary privileges
ALTER ROLE "$DB_USER" CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO "$DB_USER";

-- Connect to the protego database and transfer ownership
\c $DB_NAME

-- Grant schema permissions to Protego
GRANT ALL ON SCHEMA public TO "$DB_USER";
GRANT CREATE ON SCHEMA public TO "$DB_USER";

-- Transfer ownership of all tables to Protego
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO "$DB_USER"';
        RAISE NOTICE 'Transferred ownership of table % to $DB_USER', r.tablename;
    END LOOP;
END
\$\$;

-- Transfer ownership of all types/enums to Protego
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'ALTER TYPE public.' || quote_ident(r.typname) || ' OWNER TO "$DB_USER"';
        RAISE NOTICE 'Transferred ownership of type % to $DB_USER', r.typname;
    END LOOP;
END
\$\$;

-- Transfer ownership of all sequences to Protego
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO "$DB_USER"';
        RAISE NOTICE 'Transferred ownership of sequence % to $DB_USER', r.sequencename;
    END LOOP;
END
\$\$;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "$DB_USER";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "$DB_USER";
EOF

echo "✓ Role setup completed"

echo ""
echo "→ Testing connection..."
if PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
    echo "✅ Connection successful!"
else
    echo "⚠️  Connection test failed, but role was created"
    echo "   You may need to update pg_hba.conf for password authentication"
    echo ""
    echo "   Add this line to /etc/postgresql/*/main/pg_hba.conf:"
    echo "   host    $DB_NAME    $DB_USER    127.0.0.1/32    md5"
    echo ""
    echo "   Then restart PostgreSQL: sudo systemctl restart postgresql"
fi

echo ""
echo "==========================================
  Role Configuration Complete
=========================================="
echo ""
echo "Database details:"
echo "  - Role: $DB_USER"
echo "  - Database: $DB_NAME"
echo "  - Connection: postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
echo ""
echo "Now run: python reset_database.py"
