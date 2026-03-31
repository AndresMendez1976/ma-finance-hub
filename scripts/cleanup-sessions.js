#!/usr/bin/env node
// Cleanup expired and revoked sessions across all tenants.
// Runs as migration_user (RLS-exempt) for global access.
// Usage: node scripts/cleanup-sessions.js

const knex = require('knex');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.development') });

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

async function cleanup() {
  const deleted = await db('active_sessions')
    .where('expires_at', '<=', new Date())
    .orWhereNotNull('revoked_at')
    .del();

  console.log(`Cleaned up ${deleted} expired/revoked sessions`);
  await db.destroy();
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
