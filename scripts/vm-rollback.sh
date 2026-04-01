#!/bin/sh
# MA Finance Hub — Rollback to previous version
# Usage: ./scripts/vm-rollback.sh [commit-hash]
set -e

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"
COMMIT="${1:-HEAD~1}"

echo "=== MA Finance Hub — Rollback ==="
echo "Target: $COMMIT"

echo "1/4 Checking out $COMMIT..."
git checkout "$COMMIT"

echo "2/4 Rebuilding images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "3/4 Restarting services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans

echo "4/4 Health check..."
sleep 10
curl -sf http://localhost/health && echo " OK" || echo " Health pending"

echo ""
echo "=== Rollback Complete ==="
echo "NOTE: DB migrations are NOT rolled back automatically."
echo "To rollback migrations: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE run --rm migrate npx knex migrate:rollback --knexfile knexfile.ts"
