#!/bin/sh
set -e
echo "Starting MA Finance Hub..."
docker compose -f docker-compose.vm.yml --env-file .env.vm up -d
echo "Done. Checking health in 10s..."
sleep 10
docker compose -f docker-compose.vm.yml --env-file .env.vm ps
curl -sf http://localhost/health && echo " OK" || echo " Pending"
