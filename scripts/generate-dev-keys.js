#!/usr/bin/env node
// Generate RSA key pair for development JWT signing.
// Keys are stored in ./keys/ and excluded from git via .gitignore.
// Portable: works on Windows, macOS, and Linux without Bash or OpenSSL.

const { generateKeyPairSync } = require('node:crypto');
const { mkdirSync, existsSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const keysDir = join(__dirname, '..', 'keys');
const privatePath = join(keysDir, 'dev-private.pem');
const publicPath = join(keysDir, 'dev-public.pem');

if (existsSync(privatePath)) {
  console.log(`Keys already exist in ${keysDir}. Skipping generation.`);
  process.exit(0);
}

mkdirSync(keysDir, { recursive: true });

console.log('Generating RSA 2048-bit key pair for development...');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

writeFileSync(privatePath, privateKey, { mode: 0o600 });
writeFileSync(publicPath, publicKey, { mode: 0o644 });

console.log('Keys generated:');
console.log(`  Private: ${privatePath}`);
console.log(`  Public:  ${publicPath}`);
