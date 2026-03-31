# SPEC-001: Canonical Data Model

**Status:** Specification; NOT implemented
**Date:** 2026-03-29
**Applies to:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## Purpose

MA Finance Hub maintains the canonical accounting ledger for its tenants. This specification defines the conceptual data model at a high level. Implementation details (exact column types, constraints, indexes) will be defined in migrations as each entity is built.

## Core concepts

### Tenant scope

Every business entity below is tenant-scoped. Each table will include a `tenant_id` column referencing `tenants.id`, enforced by RLS policies (see ADR-002).

### Entity map (conceptual)

```
tenants
└── [tenant-scoped entities]
    ├── chart_of_accounts     (catalog of accounts per tenant)
    ├── accounts              (individual account records)
    ├── fiscal_periods        (year/month periods, open/closed)
    ├── journal_entries       (accounting transactions / pólizas)
    │   └── journal_lines     (debit/credit lines per entry)
    ├── posting_rules         (automation rules for inbound financial events)
    └── audit_log             (immutable record of changes)
```

### Entity descriptions

| Entity | Purpose |
|---|---|
| `tenants` | Organization identity. Already implemented. |
| `chart_of_accounts` | Defines the account structure for a tenant (e.g., SAT-aligned catalog for Mexico). |
| `accounts` | Individual accounts within the chart (asset, liability, equity, revenue, expense). |
| `fiscal_periods` | Time boundaries for accounting operations. Controls when entries can be posted. |
| `journal_entries` | Header record for an accounting transaction (póliza). |
| `journal_lines` | Individual debit/credit lines within a journal entry. Must balance to zero per entry. |
| `posting_rules` | Rules that map inbound financial events to journal entries automatically. |
| `audit_log` | Immutable append-only log for compliance and traceability. |

### Key invariants

1. **Double-entry:** Every journal entry must have lines that sum to zero (debits = credits).
2. **Period control:** Entries can only be posted to open fiscal periods.
3. **Immutability:** Posted journal entries cannot be modified; corrections are made via reversal entries.
4. **Tenant isolation:** No cross-tenant data access at the database level (RLS).

### OPEN DECISIONS

| # | Decision | Context |
|---|---|---|
| 1 | Account numbering scheme | SAT-aligned, free-form, or configurable per tenant |
| 2 | Currency handling | Single-currency per tenant or multi-currency with exchange rates |
| 3 | Decimal precision | `numeric(18,2)` vs `numeric(18,4)` for monetary amounts |
| 4 | Fiscal period granularity | Monthly only, or support for custom periods |
| 5 | Journal entry numbering | Auto-increment per tenant, or global sequence |
| 6 | Audit log scope | Which operations are logged, retention policy |
| 7 | Soft-delete policy | Which entities support soft-delete vs immutable-only |
| 8 | chart_of_accounts vs accounts | Whether these are one table or two (catalog template vs instance) |

## What is implemented (as of Day 4)

- `tenants` table only
- `schema_metadata` (infrastructure, not business)
- No business entity tables exist

## What is NOT implemented

- All entities listed above except `tenants`
- RLS policies
- Constraints between entities
- Indexes beyond PKs and unique constraints
