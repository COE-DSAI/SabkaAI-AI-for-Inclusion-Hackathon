#!/usr/bin/env python3
"""
Reset database script - drops all tables and recreates them.

WARNING: This will DELETE ALL DATA in the database!
Only use this for development/testing.

Usage:
    python reset_database.py
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
if not env_path.exists():
    print("ERROR: .env file not found!")
    print(f"Expected location: {env_path}")
    print("\nPlease copy .env.example to .env and configure your database settings.")
    sys.exit(1)

load_dotenv(env_path)

# Get database URL
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("ERROR: DATABASE_URL not set in .env file!")
    sys.exit(1)

print("=" * 60)
print("DATABASE RESET SCRIPT")
print("=" * 60)
print("\n⚠️  WARNING: This will DELETE ALL DATA in the database!")
print(f"Database: {database_url.split('@')[1] if '@' in database_url else '***'}")
print("\nThis action cannot be undone.\n")

response = input("Are you sure you want to continue? (type 'yes' to confirm): ")
if response.lower() != 'yes':
    print("\nAborted. No changes made.")
    sys.exit(0)

print("\nProceeding with database reset...")

try:
    # Create engine
    engine = create_engine(database_url)

    with engine.connect() as conn:
        print("\n1. Dropping all tables...")

        # Drop tables in correct order (respecting foreign keys)
        tables_to_drop = [
            'safe_locations',
            'alerts',
            'walk_sessions',
            'trusted_contacts',
            'users'
        ]

        for table in tables_to_drop:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                print(f"   ✓ Dropped {table}")
            except Exception as e:
                print(f"   ⚠ {table}: {str(e)[:80]}")

        conn.commit()

        print("\n2. Dropping enum types...")

        # Drop enum types
        enums_to_drop = [
            'walk_mode',
            'alerttype',
            'alertstatus'
        ]

        for enum_type in enums_to_drop:
            try:
                conn.execute(text(f"DROP TYPE IF EXISTS {enum_type} CASCADE"))
                print(f"   ✓ Dropped {enum_type}")
            except Exception as e:
                print(f"   ⚠ {enum_type}: {str(e)[:80]}")

        conn.commit()

    print("\n3. Creating new tables from models...")

    # Import models and create all tables
    from database import Base
    from models import (
        User, TrustedContact, WalkSession, Alert, SafeLocation,
        AlertStatus, AlertType, WalkMode
    )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    print("   ✓ Created all tables from SQLAlchemy models")

    # Verify tables were created
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))

        tables = [row[0] for row in result]

        print("\n4. Verification:")
        print(f"   Created {len(tables)} tables:")
        for table in tables:
            print(f"     - {table}")

        # Check enum types
        result = conn.execute(text("""
            SELECT typname
            FROM pg_type
            WHERE typtype = 'e'
            ORDER BY typname
        """))

        enums = [row[0] for row in result]
        print(f"\n   Created {len(enums)} enum types:")
        for enum in enums:
            print(f"     - {enum}")

    print("\n" + "=" * 60)
    print("✅ Database reset completed successfully!")
    print("=" * 60)
    print("\nAll tables have been recreated with the latest schema.")
    print("The database now includes:")
    print("  - Users with duress_password_hash")
    print("  - TrustedContacts (separate table)")
    print("  - WalkSessions with mode, geofence support")
    print("  - Alerts with is_duress, live_tracking_token")
    print("  - SafeLocations (new table)")
    print("\nNext steps:")
    print("1. Start the backend: uvicorn main:app --reload")
    print("2. Create a test user via /docs or signup endpoint")
    print("3. Test the new features in the frontend")

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
