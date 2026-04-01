#!/bin/sh
# MA Finance Hub — First deploy on VM
# Usage: ./scripts/vm-deploy.sh
set -e

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"

echo "=== MA Finance Hub — VM Deploy ==="

# Check env file
if [ ! -f "$ENV_FILE" ]; then
  echo "Generating .env.vm..."
  node scripts/generate-vm-env.js
fi

echo "1/5 Building images..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build

echo "2/5 Starting database + redis..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres redis

echo "Waiting for postgres health..."
until docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U postgres -d ma_finance_hub > /dev/null 2>&1; do
  sleep 2
done
echo "Postgres ready."

echo "3/5 Running migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up migrate

echo "4/5 Starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "5/5 Waiting for health checks..."
sleep 10

echo ""
echo "=== Service Status ==="
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "=== Health Check ==="
curl -sf http://localhost/health && echo "" || echo "Health check pending — wait a few seconds and retry."

echo ""
echo "=== Creating demo user ==="
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend node -e "
const knex = require('knex');
const bcrypt = require('bcryptjs');
const db = knex({
  client: 'pg',
  connection: {
    host: 'postgres', port: 5432,
    database: 'ma_finance_hub',
    user: process.env.DB_MIGRATION_USER || 'migration_user',
    password: process.env.DB_MIGRATION_PASSWORD,
  },
});
(async () => {
  const email = 'admin@demo.com';
  const existing = await db('users').where({ email }).first();
  if (existing) { console.log('Demo user exists.'); await db.destroy(); return; }
  let tenant = await db('tenants').where({ slug: 'demo' }).first();
  if (!tenant) { [tenant] = await db('tenants').insert({ name: 'Demo Company', slug: 'demo' }).returning('*'); }
  const proTier = await db('tiers').where({ code: 'pro' }).first();
  if (proTier) {
    const et = await db('tenant_tiers').where({ tenant_id: tenant.id, is_active: true }).first();
    if (!et) await db('tenant_tiers').insert({ tenant_id: tenant.id, tier_id: proTier.id, is_active: true });
  }
  const hash = await bcrypt.hash('Demo1234!', 12);
  const [user] = await db('users').insert({ external_subject: 'demo-admin', email, display_name: 'Demo Admin', password_hash: hash }).returning('*');
  await db('tenant_memberships').insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });
  const ep = await db('fiscal_periods').where({ tenant_id: tenant.id }).first();
  if (!ep) await db('fiscal_periods').insert({ tenant_id: tenant.id, fiscal_year: 2026, fiscal_month: 1, status: 'open', opened_at: new Date() });
  console.log('Demo user created: admin@demo.com / Demo1234!');
  await db.destroy();
})().catch(e => { console.error(e.message); process.exit(1); });
" 2>/dev/null || echo "Demo user setup will run after backend is fully ready. Run: ./scripts/vm-seed-demo.sh"

echo ""
echo "=== Deploy Complete ==="
echo "VM listens on port 80. Cloudflare handles HTTPS."
echo "Open https://maishq.com (after DNS A record points here, proxy ON)"
echo "Login: admin@demo.com / Demo1234!"
