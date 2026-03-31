#!/bin/sh
# Usage: ./scripts/vm-logs.sh [service] [lines]
# Examples:
#   ./scripts/vm-logs.sh            # all services, last 100 lines
#   ./scripts/vm-logs.sh backend    # backend only
#   ./scripts/vm-logs.sh proxy 50   # nginx proxy, last 50 lines
SERVICE="${1:-}"
LINES="${2:-100}"

if [ -n "$SERVICE" ]; then
  docker compose -f docker-compose.vm.yml --env-file .env.vm logs --tail "$LINES" -f "$SERVICE"
else
  docker compose -f docker-compose.vm.yml --env-file .env.vm logs --tail "$LINES" -f
fi
