# Posting Rules Engine — Functional Design (Closed)

**Status:** CLOSED — Implemented and validated
**Product:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## 1. Purpose

Translates financial events into double-entry journal entries automatically, based on tenant-configurable rules.

## 2. Event Contract

### Inbound event schema

```json
{
  "event_type": "invoice.created",        // required, max 100 chars
  "amount": 1500.00,                       // required, >= 0, max 4 decimal places
  "fiscal_period_id": 130,                 // required, must be open + not locked
  "reference": "INV-001",                  // optional, max 100 chars
  "idempotency_key": "evt-abc-123"         // optional, max 255 chars, prevents duplicate processing
}
```

### Event sources

| Source | Auth | Method |
|---|---|---|
| Platform UI (user action) | JWT + RBAC + Entitlement | `POST /api/v1/posting-rules/process` |
| External system (API) | JWT (service token) + RBAC + Entitlement | Same endpoint |
| Internal ops | Not yet wired — future: internal endpoint with HMAC | Separate endpoint TBD |

### Supported event types

Event types are tenant-defined via `posting_rules.event_type`. No hardcoded list. Examples:

- `invoice.created`
- `payment.received`
- `payment.refunded`
- `expense.recorded`
- `adjustment.manual`

## 3. Rule Model

### posting_rules

| Column | Type | Description |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK | RLS-enforced |
| event_type | varchar(100) | Matches inbound event |
| name | varchar(255) | Human-readable rule name |
| description | text | |
| is_active | boolean | Only active rules execute |
| created_at / updated_at | timestamptz | |

### posting_rule_lines

| Column | Type | Description |
|---|---|---|
| id | bigint PK | |
| tenant_id | bigint FK | RLS-enforced |
| posting_rule_id | bigint FK | CASCADE on delete |
| account_id | bigint FK | Target account |
| entry_type | 'debit' or 'credit' | |
| amount_source | varchar(255) | Resolution expression |
| line_order | integer | Execution order |

### Unique constraint

`(tenant_id, event_type, name)` on posting_rules.

## 4. Amount Resolution

| Pattern | Example | Behavior |
|---|---|---|
| `payload.<field>` | `payload.amount` | Reads `amount` from event payload; must be numeric |
| `payload.<field>` | `payload.tax` | Reads `tax` from event payload |
| Literal number | `100` | Uses fixed amount |

### Validation

- Resolved amount must be > 0
- Non-numeric field → `400 Bad Request`
- Invalid source pattern → `400 Bad Request`

## 5. Execution Flow

```
1. Receive POST /posting-rules/process with EventPayload
2. Auth: JWT → IdentityGuard → RolesGuard → EntitlementGuard (feature.journal)
3. Tenant context: SET LOCAL via transaction
4. Idempotency: if idempotency_key provided, check for existing journal entry with that reference
   → if found, return existing entry (no reprocessing)
5. Rule lookup: SELECT active posting_rules WHERE event_type = payload.event_type
   → if none found, 400 "No active posting rules"
6. For each matching rule:
   a. Resolve amount_source for each line against payload
   b. Validate all amounts > 0
   c. Validate line count >= 2
   d. Pre-validate balance (total debits = total credits)
   e. Create journal entry via JournalService.create()
      → Fiscal period validation (open + not locked)
      → Balance validation (redundant, defense in depth)
      → Sequential entry_number assignment
   f. Audit log: posting_rule_execute
7. Return: { processed: N, duplicate: false, entries: [...] }
```

## 6. Validations (layered)

| Layer | Validation |
|---|---|
| DTO | event_type required, amount >= 0, fiscal_period_id required |
| Engine | Rule exists, >= 2 lines, amounts > 0, balanced |
| Journal Service | Period open, period not locked, entry balanced |
| Database | Debit XOR credit check constraint, FK constraints, RLS |
| Immutability | Posted entries cannot be modified (DB trigger) |

## 7. Idempotency

- If `idempotency_key` is provided, the engine checks for an existing journal entry with `reference = idempotency_key`
- If found: returns existing entry, `processed: 0, duplicate: true`
- If not found: processes normally, stores `idempotency_key` as `reference`
- Scope: per tenant (RLS ensures no cross-tenant collision)

## 8. Security

- Endpoint requires: JWT + Identity + Roles (owner/admin/manager) + Entitlement (feature.journal)
- Tenant context set via `set_config()` in transaction
- All queries go through RLS
- Amount resolution is whitelist-based (`payload.*` or literal number only)
- No eval, no expression engine, no arbitrary code execution

## 9. Audit

Every rule execution creates an `audit_log` entry:

```json
{
  "action": "posting_rule_execute",
  "entity": "posting_rules",
  "entity_id": "<rule_id>",
  "metadata": {
    "event_type": "invoice.created",
    "journal_entry_id": "<created_entry_id>",
    "idempotency_key": "evt-abc-123"
  }
}
```

## 10. What is NOT in scope (v1)

- Rule CRUD API (rules are managed via migration_user / direct DB for now)
- Complex expressions (math, conditionals, multi-field formulas)
- Multi-currency amount resolution
- Tax calculation
- Async/queue-based processing
- Webhooks for rule execution notifications

## 11. Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| GET | /api/v1/posting-rules | owner/admin/manager | List active rules for tenant |
| POST | /api/v1/posting-rules/process | owner/admin/manager | Process event through rules |

## 12. API Response

### Success

```json
{
  "processed": 1,
  "duplicate": false,
  "entries": [
    {
      "rule": "Invoice Revenue Rule",
      "journalEntry": {
        "id": "34",
        "entry_number": 1,
        "status": "draft",
        "lines": [
          { "account_id": "72", "debit": "1500.0000", "credit": "0.0000" },
          { "account_id": "73", "debit": "0.0000", "credit": "1500.0000" }
        ]
      }
    }
  ]
}
```

### Duplicate (idempotent)

```json
{
  "processed": 0,
  "duplicate": true,
  "existingEntry": { ... }
}
```

### No matching rule

```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "No active posting rules for event type 'unknown.event'"
}
```
