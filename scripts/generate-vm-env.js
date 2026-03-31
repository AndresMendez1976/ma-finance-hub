#!/usr/bin/env node
// Generate .env.vm with real keys and random passwords for production VM.
// Usage: node scripts/generate-vm-env.js

const { generateKeyPairSync, randomBytes } = require('node:crypto');
const { writeFileSync, readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const rnd = (len = 32) => randomBytes(len).toString('hex').slice(0, len);

const outPath = join(__dirname, '..', '.env.vm');
if (existsSync(outPath)) {
  console.error(`ERROR: ${outPath} already exists. Remove it first if you want to regenerate.`);
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const template = readFileSync(join(__dirname, '..', '.env.vm.example'), 'utf-8');

const env = template
  .replace('CHANGE_ME_app_password', rnd(24))
  .replace('CHANGE_ME_migration_password', rnd(24))
  .replace('CHANGE_ME_postgres_superuser', rnd(24))
  .replace('CHANGE_ME_minimum_32_chars_hmac_secret', rnd(48))
  .replace('CHANGE_ME_internal_api_key', rnd(32))
  .replace(/^JWT_PUBLIC_KEY=$/m, `JWT_PUBLIC_KEY=${publicKey.replace(/\n/g, '\\n')}`)
  .replace(/^JWT_PRIVATE_KEY=$/m, `JWT_PRIVATE_KEY=${privateKey.replace(/\n/g, '\\n')}`);

writeFileSync(outPath, env);
console.log(`Generated: ${outPath}`);
console.log('Cloudflare handles TLS. VM only listens on port 80.');
