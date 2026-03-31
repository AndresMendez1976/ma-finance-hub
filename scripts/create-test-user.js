#!/usr/bin/env node
// Create a test user with password for local development.
// Usage: node scripts/create-test-user.js

const knex = require('knex');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.development') });

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ma_finance_hub',
    user: process.env.DB_MIGRATION_USER || 'migration_user',
    password: process.env.DB_MIGRATION_PASSWORD || 'migration_password_dev',
  },
});

async function main() {
  const email = 'admin@demo.com';
  const password = 'Demo1234!';
  const subject = 'demo-admin';
  const displayName = 'Demo Admin';
  const tenantName = 'Demo Company';
  const tenantSlug = 'demo';

  // Check if already exists
  const existing = await db('users').where({ email }).first();
  if (existing) {
    console.log('Test user already exists. Updating password...');
    const hash = await bcrypt.hash(password, 12);
    await db('users').where({ id: existing.id }).update({ password_hash: hash });
    console.log(`Password updated for ${email}`);
    await db.destroy();
    return;
  }

  // Create tenant
  let tenant = await db('tenants').where({ slug: tenantSlug }).first();
  if (!tenant) {
    [tenant] = await db('tenants').insert({ name: tenantName, slug: tenantSlug }).returning('*');
    console.log(`Created tenant: ${tenantName} (id=${tenant.id})`);
  } else {
    console.log(`Tenant exists: ${tenantName} (id=${tenant.id})`);
  }

  // Assign Pro tier
  const proTier = await db('tiers').where({ code: 'pro' }).first();
  if (proTier) {
    const existingTier = await db('tenant_tiers').where({ tenant_id: tenant.id, is_active: true }).first();
    if (!existingTier) {
      await db('tenant_tiers').insert({ tenant_id: tenant.id, tier_id: proTier.id, is_active: true });
      console.log(`Assigned Pro tier to tenant ${tenant.id}`);
    }
  }

  // Create user
  const hash = await bcrypt.hash(password, 12);
  const [user] = await db('users').insert({
    external_subject: subject,
    email,
    display_name: displayName,
    password_hash: hash,
  }).returning('*');
  console.log(`Created user: ${email} (id=${user.id})`);

  // Create membership
  await db('tenant_memberships').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: 'owner',
  });
  console.log(`Assigned owner role in tenant ${tenant.id}`);

  // Create initial fiscal period
  const existingPeriod = await db('fiscal_periods').where({ tenant_id: tenant.id }).first();
  if (!existingPeriod) {
    await db('fiscal_periods').insert({
      tenant_id: tenant.id,
      fiscal_year: 2026,
      fiscal_month: 1,
      status: 'open',
      opened_at: new Date(),
    });
    console.log('Created fiscal period 2026-01');
  }

  console.log('\n=== TEST USER READY ===');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Tenant:   ${tenantName} (id=${tenant.id})`);
  console.log(`Role:     owner`);
  console.log(`Tier:     Pro`);
  console.log('\nOpen http://localhost:4000/login and sign in.');

  await db.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
