#!/bin/sh
# Run migrations on VM
# Usage: ./scripts/vm-migrate.sh [latest|rollback|status]
set -e
ACTION="${1:-latest}"

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"

case "$ACTION" in
  latest)
    echo "Running migrations..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate
    ;;
  rollback)
    echo "Rolling back last migration batch..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate npx knex migrate:rollback --knexfile knexfile.ts
    ;;
  status)
    echo "Migration status..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate npx knex migrate:status --knexfile knexfile.ts
    ;;
  *)
    echo "Usage: $0 [latest|rollback|status]"
    exit 1
    ;;
esac
echo "Done."
