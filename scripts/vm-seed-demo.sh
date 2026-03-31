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

echo ""
echo "Seeding GAAP chart of accounts..."

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend node -e "
const knex = require('knex');
const db = knex({
  client: 'pg',
  connection: {
    host: 'postgres', port: 5432,
    database: 'ma_finance_hub',
    user: process.env.DB_MIGRATION_USER || 'migration_user',
    password: process.env.DB_MIGRATION_PASSWORD,
  },
});
const ACCOUNTS = [
  {c:'1000',n:'Cash',t:'asset'},{c:'1010',n:'Petty Cash',t:'asset'},{c:'1020',n:'Checking Account',t:'asset'},
  {c:'1050',n:'Savings Account',t:'asset'},{c:'1100',n:'Accounts Receivable',t:'asset'},
  {c:'1200',n:'Inventory',t:'asset'},{c:'1300',n:'Prepaid Expenses',t:'asset'},
  {c:'1500',n:'Furniture & Equipment',t:'asset'},{c:'1510',n:'Vehicles',t:'asset'},
  {c:'1600',n:'Accumulated Depreciation - Equipment',t:'asset'},
  {c:'2000',n:'Accounts Payable',t:'liability'},{c:'2100',n:'Accrued Liabilities',t:'liability'},
  {c:'2200',n:'Sales Tax Payable',t:'liability'},{c:'2300',n:'Short-term Debt',t:'liability'},
  {c:'2500',n:'Long-term Debt',t:'liability'},{c:'2600',n:'Notes Payable',t:'liability'},
  {c:'3000',n:\"Owner's Capital\",t:'equity'},{c:'3100',n:\"Owner's Draws\",t:'equity'},
  {c:'3200',n:'Retained Earnings',t:'equity'},
  {c:'4000',n:'Sales Revenue',t:'revenue'},{c:'4100',n:'Service Revenue',t:'revenue'},
  {c:'4200',n:'Interest Income',t:'revenue'},{c:'4300',n:'Other Income',t:'revenue'},
  {c:'5000',n:'Cost of Goods Sold',t:'expense'},{c:'5100',n:'Direct Labor',t:'expense'},
  {c:'6000',n:'Rent Expense',t:'expense'},{c:'6050',n:'Utilities Expense',t:'expense'},
  {c:'6100',n:'Salaries & Wages',t:'expense'},{c:'6200',n:'Insurance Expense',t:'expense'},
  {c:'6300',n:'Office Supplies',t:'expense'},{c:'6400',n:'Marketing & Advertising',t:'expense'},
  {c:'6500',n:'Depreciation Expense',t:'expense'},{c:'6600',n:'Software & Technology',t:'expense'},
  {c:'6700',n:'Travel Expense',t:'expense'},{c:'6800',n:'Repairs & Maintenance',t:'expense'},
  {c:'7000',n:'Interest Expense',t:'expense'},{c:'7100',n:'Bank Fees',t:'expense'},
];
(async () => {
  const tenantId = 1;
  let chart = await db('chart_of_accounts').where({ tenant_id: tenantId, name: 'Standard GAAP' }).first();
  if (!chart) {
    [chart] = await db('chart_of_accounts').insert({ tenant_id: tenantId, name: 'Standard GAAP', description: 'Standard US GAAP chart of accounts' }).returning('*');
    console.log('Created chart: Standard GAAP (id=' + chart.id + ')');
  } else {
    console.log('Chart exists (id=' + chart.id + ')');
  }
  let created = 0;
  for (const a of ACCOUNTS) {
    const ex = await db('accounts').where({ tenant_id: tenantId, chart_id: chart.id, account_code: a.c }).first();
    if (!ex) {
      await db('accounts').insert({ tenant_id: tenantId, chart_id: chart.id, account_code: a.c, name: a.n, account_type: a.t, is_active: true });
      created++;
    }
  }
  console.log(created + ' GAAP accounts created.');
  await db.destroy();
})().catch(e => { console.error(e.message); process.exit(1); });
"

echo "Done."
