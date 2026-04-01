#!/bin/sh
set -e
echo "Stopping MA Finance Hub..."
docker compose -f docker-compose.vm.yml --env-file .env.vm down
echo "Done. Data volumes preserved."
