#!/bin/sh
echo "=== MA Finance Hub — Status ==="
echo ""
echo "--- Containers ---"
docker compose -f docker-compose.vm.yml --env-file .env.vm ps
echo ""
echo "--- Health ---"
curl -sf http://localhost/health 2>/dev/null && echo " OK" || echo "FAIL"
echo ""
echo "--- Ready ---"
curl -sf http://localhost/ready 2>/dev/null || echo "NOT READY"
echo ""
echo "--- Disk ---"
df -h / | tail -1
echo ""
echo "--- Docker Disk ---"
docker system df 2>/dev/null || true
