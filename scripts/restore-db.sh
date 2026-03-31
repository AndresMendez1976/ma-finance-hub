#!/bin/sh
# Restore PostgreSQL database to staging compose
# Usage: ./scripts/restore-db.sh <backup-file> [compose-file]
set -e

BACKUP_FILE="$1"
COMPOSE_FILE="${2:-docker-compose.staging.yml}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore-db.sh <backup-file.sql.gz> [compose-file]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will drop and recreate the database."
echo "Press Ctrl+C within 5 seconds to abort..."
sleep 5

echo "Dropping and recreating database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U postgres -c "DROP DATABASE IF EXISTS ma_finance_hub;"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U postgres -c "CREATE DATABASE ma_finance_hub;"

echo "Restoring from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U postgres -d ma_finance_hub --quiet

echo "Running init scripts..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U postgres -d ma_finance_hub -f /docker-entrypoint-initdb.d/00-create-roles.sql

echo "Restore complete."
