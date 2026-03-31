# Implemented State: Day 1 through Day 4

**Date:** 2026-03-29
**Repo:** MA Finance Hub

---

## NestJS modules (src/)

| Module | Files | Purpose |
|---|---|---|
| AppConfigModule | `src/config/config.module.ts`, `src/config/index.ts` | Global config from env, Joi validation |
| DatabaseModule | `src/database/database.module.ts`, `src/database/index.ts` | Knex connection provider (`KNEX_CONNECTION`), pool 2-10, graceful shutdown |
| HealthModule | `src/health/health.controller.ts`, `src/health/health.module.ts`, `src/health/index.ts` | `GET /health` (liveness), `GET /ready` (readiness + DB check) |
| AppModule | `src/app.module.ts` | Root module importing Config, Database, Health |
| Bootstrap | `src/main.ts` | helmet, compression, global prefix, validation pipe, Swagger toggle |

## Migrations (migrations/)

| Migration | Batch | Purpose |
|---|---|---|
| `20260329180001_default_privileges.ts` | 1 | `ALTER DEFAULT PRIVILEGES` for tables and sequences in `public` schema → `app_user` |
| `20260329180002_create_schema_metadata.ts` | 1 | Infrastructure table: key-value metadata store |
| `20260329200000_add_updated_at_trigger_function.ts` | 2 | Reusable `set_updated_at()` trigger function; applied to `schema_metadata` |
| `20260329200001_create_tenants.ts` | 2 | Tenant registry table with auto-update trigger |

## Database tables (public schema)

| Table | Owner | Columns | Indexes | Triggers |
|---|---|---|---|---|
| `schema_metadata` | migration_user | id (bigint PK), key (varchar unique), value (text), created_at, updated_at | PK, unique(key) | `trg_schema_metadata_updated_at` |
| `tenants` | migration_user | id (bigint PK), name (varchar), slug (varchar unique), is_active (bool), created_at, updated_at | PK, unique(slug) | `trg_tenants_updated_at` |
| `knex_migrations` | migration_user | Knex internal | — | — |
| `knex_migrations_lock` | migration_user | Knex internal | — | — |

## Database functions

| Function | Purpose |
|---|---|
| `set_updated_at()` | Trigger function: sets `NEW.updated_at = now()` before UPDATE |

## Database roles

| Role | Purpose | Privileges |
|---|---|---|
| `postgres` | Superuser, init only | Full |
| `migration_user` | Schema management | ALL ON SCHEMA public, GRANT app_user, CONNECT |
| `app_user` | App runtime | CONNECT, USAGE ON SCHEMA, DML via DEFAULT PRIVILEGES |

## Infrastructure files

| File | Purpose |
|---|---|
| `docker-compose.yml` | PostgreSQL 16 Alpine, port 5432, healthcheck |
| `db/init/00-create-roles.sql` | Creates roles on first container start |
| `knexfile.ts` | Knex config, migration_user connection, env-based |
| `scripts/generate-dev-keys.js` | RSA key pair generation (Node.js crypto, portable) |
| `.env.example` | Template for all env vars |
| `.env.development` | Local dev env vars |

## Config files

| File | Purpose |
|---|---|
| `tsconfig.json` | Base TypeScript config, strict mode |
| `tsconfig.build.json` | Build config, incremental=false, rootDir=src |
| `nest-cli.json` | NestJS CLI config, deleteOutDir=true |
| `.eslintrc.js` | ESLint + TypeScript + Prettier |
| `.prettierrc` | Prettier config |
| `jest.config.ts` | Unit test config (roots: test/unit) |
| `test/jest-integration.config.ts` | Integration test config (roots: test/integration, 60s timeout) |

## Dependencies installed but not yet used

| Package | Purpose | Blocked by |
|---|---|---|
| `@nestjs/passport` | Auth module | ADR-003 implementation |
| `passport` | Auth strategy framework | ADR-003 implementation |
| `passport-jwt` | JWT strategy | ADR-003 implementation |
| `jsonwebtoken` | JWT signing/verification | ADR-003 implementation |
| `@nestjs/swagger` | API documentation | Partially used (setup in bootstrap, no controllers annotated) |
| `uuid` | UUID generation | No current use case |

## Validated behaviors

| Check | Status |
|---|---|
| `npm run build` produces `dist/main.js` | OK |
| `npm run start:dev` starts NestJS | OK |
| `GET /health` returns `{"status":"ok"}` | OK |
| `GET /ready` returns DB-connected response | OK |
| `migrate:latest` / `migrate:rollback` cycle | OK |
| `app_user` can SELECT on all business tables | OK |
| `updated_at` auto-updates on UPDATE via trigger | OK |
| Dev key generation via Node.js script | OK |
| Docker Compose PostgreSQL healthcheck | OK |

## What does NOT exist

- No business entity tables (accounts, journal_entries, fiscal_periods, etc.)
- No auth module or guards
- No protected endpoints
- No RLS policies
- No tenant_id on any table (only tenants table itself)
- No test files (unit or integration)
- No seed data
- No CI/CD pipeline
- No Dockerfile for the application
