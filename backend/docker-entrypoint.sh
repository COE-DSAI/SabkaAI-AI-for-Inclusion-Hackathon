#!/bin/bash
set -e

echo "🚀 Starting Protego Backend..."

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "db" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is up"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until redis-cli -h redis ping 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is up"

# Run database migrations
echo "🔄 Running database migrations..."
python reset_database.py || echo "⚠️  Migration failed, continuing..."

echo "✅ Database setup complete"

# Start the application
echo "🎉 Starting Gunicorn server..."
exec "$@"
