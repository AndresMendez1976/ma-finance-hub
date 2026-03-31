#!/bin/sh
# MA Finance Hub — Create demo tenant + user on VM
# Usage: ./scripts/vm-seed-demo.sh
set -e

COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"

echo "Creating demo tenant and user..."

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
  const password = 'Demo1234!';

  const existing = await db('users').where({ email }).first();
  if (existing) {
    console.log('Demo user already exists. Updating password...');
    const hash = await bcrypt.hash(password, 12);
    await db('users').where({ id: existing.id }).update({ password_hash: hash });
    console.log('Password updated.');
    await db.destroy();
    return;
  }

  // Create tenant
  let tenant = await db('tenants').where({ slug: 'demo' }).first();
  if (!tenant) {
    [tenant] = await db('tenants').insert({ name: 'Demo Company', slug: 'demo' }).returning('*');
    console.log('Created tenant: Demo Company (id=' + tenant.id + ')');
  } else {
    console.log('Tenant exists: Demo Company (id=' + tenant.id + ')');
  }

  // Assign Pro tier
  const proTier = await db('tiers').where({ code: 'pro' }).first();
  if (proTier) {
    const et = await db('tenant_tiers').where({ tenant_id: tenant.id, is_active: true }).first();
    if (!et) {
      await db('tenant_tiers').insert({ tenant_id: tenant.id, tier_id: proTier.id, is_active: true });
      console.log('Assigned Pro tier');
    }
  }

  // Create user
  const hash = await bcrypt.hash(password, 12);
  const [user] = await db('users').insert({
    external_subject: 'demo-admin',
    email,
    display_name: 'Demo Admin',
    password_hash: hash,
  }).returning('*');
  console.log('Created user: ' + email + ' (id=' + user.id + ')');

  // Create membership
  await db('tenant_memberships').insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });
  console.log('Assigned owner role');

  // Create fiscal period
  const ep = await db('fiscal_periods').where({ tenant_id: tenant.id }).first();
  if (!ep) {
    await db('fiscal_periods').insert({
      tenant_id: tenant.id, fiscal_year: 2026, fiscal_month: 1,
      status: 'open', opened_at: new Date(),
    });
    console.log('Created fiscal period 2026-01');
  }

  console.log('');
  console.log('=== DEMO USER READY ===');
  console.log('Email:    admin@demo.com');
  console.log('Password: Demo1234!');
  console.log('Tenant:   Demo Company (id=' + tenant.id + ')');
  console.log('Role:     owner');
  console.log('Tier:     Pro');

  await db.destroy();
})().catch(e => { console.error(e.message); process.exit(1); });
"

echo "Done."
