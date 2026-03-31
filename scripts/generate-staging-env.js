#!/usr/bin/env node
// Generate .env.staging with real keys and random passwords.
// Usage: node scripts/generate-staging-env.js

const { generateKeyPairSync, randomBytes } = require('node:crypto');
const { writeFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const rnd = (len = 32) => randomBytes(len).toString('hex').slice(0, len);

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const template = readFileSync(join(__dirname, '..', '.env.staging.example'), 'utf-8');

const env = template
  .replace('CHANGE_ME_app_password', rnd(24))
  .replace('CHANGE_ME_migration_password', rnd(24))
  .replace('CHANGE_ME_postgres_superuser', rnd(24))
  .replace('CHANGE_ME_minimum_32_chars_hmac_secret', rnd(48))
  .replace(/^JWT_PUBLIC_KEY=$/m, `JWT_PUBLIC_KEY=${publicKey.replace(/\n/g, '\\n')}`)
  .replace(/^JWT_PRIVATE_KEY=$/m, `JWT_PRIVATE_KEY=${privateKey.replace(/\n/g, '\\n')}`);

const outPath = join(__dirname, '..', '.env.staging');
writeFileSync(outPath, env);
console.log(`Generated: ${outPath}`);
console.log('Review and adjust before deploying.');
