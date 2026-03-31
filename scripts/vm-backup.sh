#!/bin/sh
# MA Finance Hub — Backup database on VM
# Usage: ./scripts/vm-backup.sh
set -e

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/ma_finance_hub_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up database..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U postgres -d ma_finance_hub --no-owner --no-acl \
  | gzip > "$BACKUP_FILE"

SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "Backup complete: $BACKUP_FILE ($SIZE)"

# Rotate: keep last 10 backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/ma_finance_hub_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
  REMOVE_COUNT=$((BACKUP_COUNT - 10))
  ls -1t "$BACKUP_DIR"/ma_finance_hub_*.sql.gz | tail -n "$REMOVE_COUNT" | xargs rm -f
  echo "Rotated: removed $REMOVE_COUNT old backup(s), keeping 10."
fi

echo ""
echo "To upload to R2/S3:"
echo "  aws s3 cp $BACKUP_FILE s3://your-bucket/backups/"
echo "  # or with rclone:"
echo "  rclone copy $BACKUP_FILE r2:your-bucket/backups/"
