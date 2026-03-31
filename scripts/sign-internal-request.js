#!/usr/bin/env node
// Sign an internal API request for production HMAC mode.
// Usage: node scripts/sign-internal-request.js <method> <path> [body-json]
// Reads INTERNAL_OPS_SECRET from env.

const { createHmac } = require('node:crypto');

const secret = process.env.INTERNAL_OPS_SECRET;
if (!secret) { console.error('INTERNAL_OPS_SECRET not set'); process.exit(1); }

const method = process.argv[2];
const path = process.argv[3];
const body = process.argv[4] || '';
if (!method || !path) { console.error('Usage: sign-internal-request.js <method> <path> [body]'); process.exit(1); }

const timestamp = String(Date.now());
const payload = `${timestamp}.${method}.${path}.${body}`;
const hmac = createHmac('sha256', secret).update(payload).digest('hex');

console.log(`x-internal-signature: ${timestamp}.${hmac}`);
