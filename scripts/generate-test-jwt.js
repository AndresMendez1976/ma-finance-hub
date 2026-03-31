#!/usr/bin/env node
// Generate test JWT tokens for development validation.
// Usage: node scripts/generate-test-jwt.js <tenant_id> [issuer] [sub] [jti]

const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');

const tenantId = parseInt(process.argv[2], 10);
if (!tenantId || tenantId <= 0) {
  console.error('Usage: node scripts/generate-test-jwt.js <tenant_id> [issuer] [sub] [jti]');
  process.exit(1);
}

const issuer = process.argv[3] || 'ma-finance-hub-dev';
const sub = process.argv[4] || `test-user-${tenantId}`;
const jti = process.argv[5] || randomUUID();

const privateKeyPath = join(__dirname, '..', 'keys', 'dev-private.pem');
const privateKey = readFileSync(privateKeyPath, 'utf-8');

const token = jwt.sign(
  {
    sub,
    tenant_id: tenantId,
    roles: ['user'],
  },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer,
    audience: 'ma-finance-hub',
    keyid: 'dev-key-001',
    jwtid: jti,
  },
);

console.log(token);
