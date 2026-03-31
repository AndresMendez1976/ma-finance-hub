# SPEC-002: API

**Status:** Specification; minimally implemented
**Date:** 2026-03-29
**Applies to:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## Purpose

MA Finance Hub exposes a REST API for accounting and financial operations. The API serves the platform's own UI, administrative tools, and authorized external systems. This specification defines the API surface, conventions, and current state.

## API conventions

| Convention | Value | Source |
|---|---|---|
| Global prefix | `/api/v1` | `API_PREFIX` env var |
| Excluded from prefix | `/health`, `/ready` | main.ts bootstrap |
| Content type | `application/json` | NestJS default |
| Validation | Whitelist + forbidNonWhitelisted | Global ValidationPipe |
| Documentation | Swagger at `/docs` | Enabled when `SWAGGER_ENABLED=true` |

## Endpoints — Implemented

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Liveness probe. Returns `{"status":"ok"}`. |
| `GET` | `/ready` | No | Readiness probe. Checks DB connectivity. Returns `{"status":"ok","db":"connected","timestamp":"..."}`. |

## Endpoints — Planned (not implemented)

> These are projected based on the canonical model (SPEC-001). None exist in code yet.

| Domain | Projected endpoints | Notes |
|---|---|---|
| Tenants | CRUD on `/api/v1/tenants` | Admin-only; provisioning flow TBD |
| Accounts | CRUD on `/api/v1/accounts` | Tenant-scoped |
| Fiscal periods | CRUD + open/close on `/api/v1/fiscal-periods` | Tenant-scoped |
| Journal entries | Create + list + get on `/api/v1/journal-entries` | Tenant-scoped; immutable after posting |
| Event ingestion | Receive financial events on `/api/v1/events` | Tenant-scoped; triggers posting rules |

## API consumers

| Consumer | Auth method | Notes |
|---|---|---|
| Platform UI | JWT (user session) | Primary consumer |
| Admin tools | JWT (admin role) | Tenant management, system config |
| External systems | JWT (service token) | Optional integration; any authorized system can call the API |

> The API does not assume any specific external caller. It is a generic, self-contained financial platform API.

### OPEN DECISIONS

| # | Decision | Context |
|---|---|---|
| 1 | Pagination strategy | Offset-based vs cursor-based |
| 2 | Error response format | Standardized error envelope TBD |
| 3 | Versioning strategy | URL prefix (`/api/v1`) is current; header-based alternative? |
| 4 | Rate limiting | Not implemented; needed for production |
| 5 | CORS policy | Not configured; depends on deployment topology |
| 6 | Request ID / tracing | Not implemented; needed for observability |
| 7 | Bulk operations | Whether batch endpoints are needed for event ingestion |

## NestJS module structure (current)

```
AppModule
├── AppConfigModule    (global, Joi-validated env)
├── DatabaseModule     (Knex connection, pool 2-10)
└── HealthModule       (GET /health, GET /ready)
```

No business controllers exist. No auth guards are applied.
