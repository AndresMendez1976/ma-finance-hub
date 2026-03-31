# Endpoint Classification

## Public (No auth)

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Liveness probe |
| GET | /ready | Readiness probe (DB check) |

## Tenant-User (JWT + Identity + RBAC + Entitlement)

| Method | Path | Min Role | Entitlement |
|---|---|---|---|
| GET | /api/v1/auth/context | any | - |
| POST | /api/v1/auth/logout | any | - |
| POST | /api/v1/auth/logout-all | owner/admin | - |
| GET | /api/v1/auth/tenant-smoke | any | - |
| GET | /api/v1/auth/rbac/admin | owner/admin | - |
| GET | /api/v1/auth/rbac/owner | owner | - |
| GET | /api/v1/auth/rbac/manager-plus | owner/admin/manager | - |
| GET | /api/v1/tiers/catalog | any | - |
| GET | /api/v1/tiers/current | any | - |
| GET | /api/v1/chart-of-accounts | any | feature.chart_of_accounts |
| GET | /api/v1/chart-of-accounts/:id | any | feature.chart_of_accounts |
| POST | /api/v1/chart-of-accounts | owner/admin | feature.chart_of_accounts |
| PATCH | /api/v1/chart-of-accounts/:id | owner/admin | feature.chart_of_accounts |
| GET | /api/v1/accounts | any | feature.accounts |
| GET | /api/v1/accounts/:id | any | feature.accounts |
| POST | /api/v1/accounts | owner/admin/manager | feature.accounts |
| PATCH | /api/v1/accounts/:id | owner/admin/manager | feature.accounts |
| GET | /api/v1/journal-entries | any | feature.journal |
| GET | /api/v1/journal-entries/:id | any | feature.journal |
| POST | /api/v1/journal-entries | owner/admin/manager | feature.journal |
| POST | /api/v1/journal-entries/:id/post | owner/admin/manager | feature.journal |
| GET | /api/v1/admin/users | owner/admin | feature.admin |
| POST | /api/v1/admin/users | owner/admin | feature.admin |
| POST | /api/v1/admin/memberships | owner/admin | feature.admin |
| PATCH | /api/v1/admin/memberships/:id | owner/admin | feature.admin |

## Internal-Only (x-internal-api-key header, no JWT)

| Method | Path | Purpose |
|---|---|---|
| POST | /api/v1/tiers/internal/assign | Tier assignment by billing/ops system |

## Security notes

- Internal endpoints MUST NOT be exposed to the public internet without network-level protection
- `INTERNAL_API_KEY` must be a strong secret, never hardcoded
- All tenant-user endpoints enforce RLS at the database level
- All mutating operations are audit-logged
- Session tracking enforces concurrent session limits per tier
