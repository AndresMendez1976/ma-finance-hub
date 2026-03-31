# SPEC-003: Event Ingestion

**Status:** Specification; NOT implemented
**Date:** 2026-03-29
**Applies to:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## Purpose

Defines how financial events enter the platform and get processed into accounting entries. Events can originate from the platform's own UI, from external systems via API, or from batch imports. The platform is self-contained and does not assume any specific event source.

## Event sources

| Source | Mechanism | Example |
|---|---|---|
| Platform UI | Direct API call from frontend | User creates an invoice in MA Finance Hub |
| External system via API | Authenticated REST call | MA ChiroBill, INIP, or any third-party ERP sends a billing event |
| Batch import | File upload or scheduled sync | CSV import of historical transactions |

### Independence principle

The platform does not depend on any external system at runtime. External systems integrate by calling the platform's public API with a valid service token. If no external system is connected, the platform operates fully standalone via its own UI.

## Event lifecycle

```
1. Event arrives (API call, UI action, or batch import)
2. Authentication: JWT validated, tenant context extracted
3. Tenant boundary: event scoped to authenticated tenant
4. Validation: event payload validated against expected schema
5. Posting: applicable posting rules looked up and executed (see SPEC-004)
6. Persistence: journal entry + lines persisted in a transaction
7. Response: success/failure returned to caller
```

## Event envelope (conceptual)

> No schema is finalized. This is the projected structure.

```json
{
  "event_type": "invoice.created",
  "idempotency_key": "evt-abc-123",
  "timestamp": "2026-03-29T12:00:00Z",
  "payload": {
    "amount": 500.00,
    "currency": "MXN",
    "description": "Consultation invoice",
    "reference": "INV-2026-001",
    "metadata": {}
  }
}
```

### Tenant context

Tenant identity comes from the JWT, not from the event payload. The platform never trusts the caller to self-declare their tenant — it is extracted from the authenticated token and enforced via RLS.

## Integration patterns

### Synchronous (default)

Caller sends event via `POST /api/v1/events`. Platform processes immediately and returns the created journal entry or an error.

### Asynchronous (future consideration)

Platform accepts the event, returns an acknowledgment, and processes asynchronously via an internal queue. Caller can poll for status.

> **OPEN DECISION:** Whether async processing is needed in v1 or deferred to a later version.

## Idempotency

Each event includes an `idempotency_key`. If the platform receives a duplicate key for the same tenant, it returns the existing result without reprocessing. This prevents double-posting from retries.

## Error handling

| Scenario | Response | Side effect |
|---|---|---|
| Valid event, posting succeeds | 201 Created + journal entry | Entry persisted |
| Valid event, no matching posting rule | 422 Unprocessable | Nothing persisted |
| Duplicate idempotency_key | 200 OK + existing result | Nothing new persisted |
| Invalid payload | 400 Bad Request | Nothing persisted |
| Unauthorized | 401 Unauthorized | Nothing persisted |
| Tenant mismatch / forbidden | 403 Forbidden | Nothing persisted |
| Fiscal period closed | 409 Conflict | Nothing persisted |

## OPEN DECISIONS

| # | Decision | Context |
|---|---|---|
| 1 | Async processing | Whether to support async event processing in v1 |
| 2 | Event schema registry | How event types and their payload schemas are defined and versioned |
| 3 | Idempotency key format | UUID, caller-defined string, or structured key |
| 4 | Retry guidance | What retry policy to recommend to API consumers |
| 5 | Event ordering | Whether the platform guarantees processing order |
| 6 | Batch event endpoint | Whether to support submitting multiple events in a single request |
| 7 | Event status tracking | Whether callers can query the status of a previously submitted event |

## What is implemented (as of Day 4)

Nothing. No event ingestion endpoint, schema, or processing logic exists.

## What is NOT implemented

- Event ingestion API endpoint
- Event validation
- Idempotency mechanism
- Posting rule execution triggered by events
- Batch import
- Async processing queue
