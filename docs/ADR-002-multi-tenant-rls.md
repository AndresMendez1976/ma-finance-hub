# ADR-002: Multi-Tenant Architecture with Row-Level Security

**Status:** Approved; partially implemented
**Date:** 2026-03-29
**Applies to:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## Context

MA Finance Hub serves multiple organizations (tenants). Each tenant's financial data must be strictly isolated — no cross-tenant data access, no soft filtering as the sole mechanism. A shared-database, shared-schema approach with Row-Level Security (RLS) provides hard isolation at the database level without per-tenant infrastructure overhead.

## Decision

### Tenancy model

- **Approach:** Shared database, shared schema, tenant discriminator column.
- **Discriminator:** Every tenant-scoped table includes a `tenant_id` column (bigint FK to `tenants`).
- **Isolation mechanism:** PostgreSQL Row-Level Security (RLS) policies enforced at the database level.

### Tenant registry

The `tenants` table is the source of truth for tenant identity:

```
tenants
├── id          bigint PK (identity)
├── name        varchar(255) NOT NULL
├── slug        varchar(255) NOT NULL UNIQUE
├── is_active   boolean NOT NULL DEFAULT true
├── created_at  timestamptz NOT NULL
└── updated_at  timestamptz NOT NULL (auto-updated via trigger)
```

**Implementation status:** Table exists and is migrated.

### Database roles and minimum privilege

| Role | Purpose | Privileges |
|---|---|---|
| `postgres` | Superuser, container init only | Full |
| `migration_user` | Knex migrations, schema management | DDL on `public` schema, can GRANT to `app_user` |
| `app_user` | NestJS runtime connection | DML only (SELECT, INSERT, UPDATE, DELETE) via DEFAULT PRIVILEGES |

Default privileges are set so that any table or sequence created by `migration_user` in the `public` schema automatically grants appropriate DML access to `app_user`.

**Implementation status:** Roles exist. Default privileges migrated.

### RLS strategy

> **OPEN DECISION:** RLS policies are not yet implemented. The following is the approved architectural direction.

1. Each tenant-scoped table will have an RLS policy restricting rows to `current_setting('app.current_tenant_id')`.
2. The application sets this session variable on each request after JWT validation.
3. RLS is enforced for `app_user` only; `migration_user` bypasses RLS for migrations.

**Pattern (not yet implemented):**

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table> FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = current_setting('app.current_tenant_id')::bigint);
```

### OPEN DECISIONS

| # | Decision | Context |
|---|---|---|
| 1 | Session variable mechanism | How/where `app.current_tenant_id` is set per request — middleware vs guard vs interceptor |
| 2 | Cross-tenant queries | Whether admin/superadmin roles can query across tenants, and how |
| 3 | Tenant provisioning flow | API endpoint vs admin script vs platform UI |
| 4 | Tenant soft-delete vs hard-delete | `is_active = false` exists; full deletion policy TBD |

## What is implemented (as of Day 4)

- `tenants` table with identity PK, slug unique, is_active, timestamps, auto-update trigger
- `migration_user` / `app_user` role separation
- Default privileges for tables and sequences in `public` schema
- `app_user` confirmed able to SELECT on `tenants`

## What is NOT implemented

- RLS policies on any table
- Session variable injection (`app.current_tenant_id`)
- `tenant_id` column on any table (no tenant-scoped tables exist yet)
- Tenant provisioning API
- Cross-tenant admin access
