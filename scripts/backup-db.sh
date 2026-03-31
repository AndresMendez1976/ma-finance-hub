#!/bin/sh
# Backup PostgreSQL database from staging compose
# Usage: ./scripts/backup-db.sh [compose-file]
set -e

COMPOSE_FILE="${1:-docker-compose.staging.yml}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/ma_finance_hub_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up database..."
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U postgres -d ma_finance_hub --no-owner --no-acl \
  | gzip > "$BACKUP_FILE"

SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "Backup complete: $BACKUP_FILE ($SIZE)"
