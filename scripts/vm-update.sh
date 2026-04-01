#!/bin/sh
# MA Finance Hub — Update deployment on VM
# Usage: ./scripts/vm-update.sh
set -e

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"

echo "=== MA Finance Hub — Update ==="

echo "1/4 Pulling latest code..."
git pull --ff-only

echo "2/4 Rebuilding images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "3/4 Running migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up migrate

echo "4/4 Rolling restart..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo ""
echo "Waiting for health..."
sleep 10
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
curl -sf http://localhost/health && echo " OK" || echo " Health pending"
echo ""
echo "=== Update Complete ==="
