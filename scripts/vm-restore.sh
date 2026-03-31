#!/bin/sh
# MA Finance Hub — Restore database on VM
# Usage: ./scripts/vm-restore.sh <backup-file.sql.gz>
set -e

BACKUP_FILE="$1"
COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/vm-restore.sh <backup-file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lht ./backups/ma_finance_hub_*.sql.gz 2>/dev/null || echo "  No backups found in ./backups/"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will drop and recreate the database."
echo "Press Ctrl+C within 5 seconds to abort..."
sleep 5

echo "Stopping backend and frontend..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop backend frontend proxy

echo "Dropping and recreating database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U postgres -c "DROP DATABASE IF EXISTS ma_finance_hub;"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U postgres -c "CREATE DATABASE ma_finance_hub;"

echo "Restoring from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U postgres -d ma_finance_hub --quiet

echo "Running init scripts..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  psql -U postgres -d ma_finance_hub -f /docker-entrypoint-initdb.d/00-create-roles.sql

echo "Restarting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
echo "Restore complete."
