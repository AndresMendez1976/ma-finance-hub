# ADR-003: Authentication and Authorization

**Status:** Approved; NOT implemented
**Date:** 2026-03-29
**Applies to:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## Context

MA Finance Hub is a multi-tenant, multi-user financial platform. Authentication verifies caller identity; authorization ensures the caller can perform the requested action within the correct tenant scope. This product owns its own auth — it does not depend on any external product for authentication at runtime.

## Decision

### Authentication

- **Mechanism:** JWT bearer tokens.
- **Library:** Passport.js with `passport-jwt` strategy via `@nestjs/passport`.
- **Token signing:** RSA key pairs (RS256).
  - Dev keys generated via `scripts/generate-dev-keys.js` (Node.js `crypto` module).
  - Keys stored in `./keys/` (gitignored).
- **Token validation:** The platform validates tokens issued by whitelisted issuers.

### Environment variables (defined, not consumed yet)

```
JWT_DEV_PRIVATE_KEY_PATH=./keys/dev-private.pem
JWT_DEV_PUBLIC_KEY_PATH=./keys/dev-public.pem
JWT_DEV_KID=dev-key-001
JWT_AUDIENCE=ma-finance-hub
JWT_ISSUER_WHITELIST=ma-chiro-bill-suite,inip,ma-finance-hub-dev
```

> **Note:** `JWT_ISSUER_WHITELIST` includes issuers from other MA products. This allows those products to delegate financial operations to this platform via API. This is an **optional integration**, not a runtime dependency. MA Finance Hub validates tokens independently regardless of issuer.

### Authorization

> **OPEN DECISION:** Authorization model is not yet defined beyond tenant isolation via RLS.

### Dependencies installed but not wired

| Package | Version | Status |
|---|---|---|
| `@nestjs/passport` | 10.0.3 | Installed, not imported in any module |
| `passport` | 0.7.0 | Installed, not used |
| `passport-jwt` | 4.0.1 | Installed, not used |
| `jsonwebtoken` | 9.0.2 | Installed, not used |

### OPEN DECISIONS

| # | Decision | Context |
|---|---|---|
| 1 | JWT payload schema | What claims are required (tenant_id, user_id, roles, permissions) |
| 2 | Role/permission model | RBAC vs ABAC vs simple role enum |
| 3 | Guard implementation | Global guard vs per-route guard |
| 4 | Token refresh strategy | Platform-owned or delegated to IdP |
| 5 | External system integration auth | How external systems (e.g., ChiroBill, INIP) authenticate when calling this platform's API — service token vs user-delegated token |
| 6 | Public endpoints | Which endpoints (beyond /health, /ready) are unauthenticated |
| 7 | Key rotation | Strategy for rotating RSA keys in production |

## What is implemented (as of Day 4)

- RSA dev key generation script (`scripts/generate-dev-keys.js`)
- JWT-related env variables defined in `.env.example` and `.env.development`
- Auth dependencies installed in `package.json`
- Joi validation for JWT env vars NOT yet in ConfigModule (they are in `allowUnknown: true` passthrough)

## What is NOT implemented

- Passport strategy configuration
- JWT validation guard
- Auth module in NestJS
- Token decoding and tenant context injection
- Any protected route
- Any role or permission check
