# ARCHITECTURE-RESET

**Status:** MANDATORY — supersedes all previous architectural assumptions
**Date:** 2026-03-29
**Triggered by:** Incorrect Layer A / Layer B model detected across all project documentation

---

## A. Previous assumptions — INVALIDATED

The following assumptions existed in documentation and code. **All are incorrect and invalidated.**

### A.1 — "MA Finance Hub is Layer B of MA Chiro Bill Suite"

| Location | Incorrect text |
|---|---|
| `package.json:4` | `"description": "MA Finance Hub - Layer B accounting core"` |
| `src/main.ts:34` | `.setDescription('Layer B - Accounting Core API')` |
| `docs/ADR-001-stack.md:11` | "MA Finance Hub is Layer B of the MA Chiro Bill Suite" |
| `docs/ADR-001-stack.md:5` | "Applies to: MA Finance Hub (Layer B — Accounting Core)" |

**Why invalid:** MA Finance Hub is not a subordinate layer of MA ChiroBill Suite. It is not a "Layer B" to anyone's "Layer A". It is a product family that will produce 3 independent financial products.

### A.2 — "Layer A produces events, Layer B consumes them"

| Location | Incorrect text |
|---|---|
| `docs/SPEC-003-layer-a-to-layer-b.md` (entire file) | Defines a fixed Layer A→B event pipeline where ChiroBill is the producer and Finance Hub is a subordinate consumer |
| `docs/SPEC-004-posting-rules.md:11` | "business events from Layer A" |
| `docs/SPEC-001-canonical-model.md:29,43` | "automation rules for Layer A events" |
| `docs/ADR-003-auth-authz.md:11` | "Layer B receives requests from Layer A" |

**Why invalid:** There is no fixed Layer A/Layer B relationship. Each of the 3 products is independent. Integration between products (e.g., ChiroBill sending billing events to its own financial module) is an internal concern of each product, not a cross-product dependency.

### A.3 — Implicit single-product assumption

All documents assumed a single product: "MA Finance Hub = accounting backend for ChiroBill." This is wrong. The correct architecture defines 3 independent financial products, each with its own domain, compliance boundary, and deployment independence.

### A.4 — "Accounting core" as central dependency

| Location | Incorrect text |
|---|---|
| `docs/SPEC-002-api-layer-b.md:1,11` | "API — Layer B", "Layer B exposes a REST API" |
| `docs/ADR-002-multi-tenant-rls.md:5` | "Applies to: MA Finance Hub (Layer B)" |
| `docs/SPEC-001-canonical-model.md:5` | "Applies to: MA Finance Hub (Layer B)" |

**Why invalid:** There is no "Layer B" identity. Each product owns its own financial capabilities.

---

## B. Correct architecture — APPROVED

### B.1 — Three independent financial products

```
MA Finance Hub (product family)
├── 1. Healthcare Financial Compliance Module
│      First implementation: MA ChiroBill Suite
│      Domain: healthcare billing, HIPAA compliance
│      Reusable across healthcare systems
│
├── 2. Industrial Financial Impact Module
│      First implementation: INIP
│      Domain: OT/industrial costs, production losses, asset financials
│      Reusable across industrial/OT systems
│
└── 3. Finance SaaS / Standalone Platform
       Standalone product, SaaS + on-premise
       Domain: general accounting, administration, finance
       Updatable regulatory/fiscal rules
```

### B.2 — Independence rule

Each product:
- Has its own codebase (or clearly separated module boundary)
- Has its own database schema (or strict schema-level isolation)
- Has its own compliance boundary
- Can be deployed independently
- Does NOT require any of the other 2 products at runtime
- Does NOT depend on a shared "core" executable

### B.3 — What IS common (permitted)

| Common element | Type | Example |
|---|---|---|
| Tier strategy | Business model | Free / Pro / Enterprise feature gates |
| Feature activation / entitlement | Business model | Per-tenant feature flags by tier |
| Pricing model | Business model | Subscription, usage-based, hybrid |
| Design criteria | Standard | API conventions, error formats, naming |
| Security standards | Standard | Auth patterns, audit requirements, encryption |
| Architecture patterns | Pattern | Multi-tenant RLS approach, migration strategy |
| Quality standards | Standard | Testing requirements, code review process |
| Documentation templates | Template | ADR format, SPEC format |

### B.4 — What is NOT common (forbidden as runtime dependency)

| Forbidden | Why |
|---|---|
| Shared runtime core library | Creates coupling; one product's bug breaks all three |
| Shared database instance (cross-product) | Violates compliance boundaries; healthcare data must not co-reside with industrial data |
| Shared auth service (mandatory) | Each product must be able to authenticate independently |
| Cross-product API calls in the critical path | One product's downtime must not cascade |

---

## C. Non-negotiable principles

### C.1 — Multi-user / Multi-session

- All 3 products are multi-user from base design
- Concurrent sessions supported
- Roles, permissions, and scope defined per tier and per tenant
- No single-user assumptions anywhere

### C.2 — Multi-tenant with hard isolation

- Every product supports multi-tenant where applicable
- Tenant boundary is enforced at the database level (RLS), not just application filtering
- Never mix companies/organizations
- Every query, process, report, export, job, cache, and audit entry respects tenant boundaries
- Soft filtering alone is NOT acceptable as isolation mechanism

### C.3 — Security

- Defense against backdoors, cyberattacks, and internal abuse
- Minimum privilege (already implemented: migration_user / app_user separation)
- Immutable audit trail
- Full traceability
- Strong permission separation
- No insecure defaults
- No shared secrets across products

### C.4 — Compliance separation

| Product | Compliance domain | Must NOT mix with |
|---|---|---|
| Healthcare Financial Compliance Module | HIPAA, healthcare billing regulations | Industrial OT compliance, general SaaS |
| Industrial Financial Impact Module | OT/industrial regulations, cybersecurity frameworks | Healthcare HIPAA, general SaaS |
| Finance SaaS / Standalone | General fiscal/tax/regulatory compliance | Healthcare HIPAA, industrial OT |

Each product's compliance boundary is independent. Regulatory requirements from one domain must never leak into or be confused with another.

---

## D. What this means for the current repo

### D.1 — Current repo identity

This repo (`ma-finance-hub`) currently contains infrastructure and patterns that are valid as a **starting point for one of the 3 products**. The code implemented in Days 1–4 is product-agnostic foundation:

| What exists | Product-agnostic? | Reusable across products? |
|---|---|---|
| NestJS scaffold | Yes | As a pattern, not as shared code |
| ConfigModule with Joi | Yes | As a pattern |
| DatabaseModule with Knex | Yes | As a pattern |
| HealthModule | Yes | As a pattern |
| Multi-tenant `tenants` table | Yes | As a pattern |
| RLS strategy (not yet implemented) | Yes | As a pattern |
| Default privileges migration | Yes | As a pattern |
| `set_updated_at()` trigger | Yes | As a pattern |

### D.2 — Decision required before Day 6

> **CRITICAL OPEN DECISION:** Which product does this repo become?

Options:
1. This repo becomes the **Finance SaaS / Standalone Platform** (most general, least domain-specific)
2. This repo becomes the **Healthcare Financial Compliance Module** (first customer: MA ChiroBill)
3. This repo becomes a **template/reference** that gets forked into 3 separate repos

**This decision must be made before any domain-specific code is written.**

---

## E. Documents that must be corrected

| Document | Problem | Required correction |
|---|---|---|
| `docs/ADR-001-stack.md` | Lines 5, 11: "Layer B", "Layer B of MA Chiro Bill Suite" | Remove Layer A/B framing. Describe as independent product. |
| `docs/ADR-002-multi-tenant-rls.md` | Line 5: "Layer B" | Remove Layer B label. |
| `docs/ADR-003-auth-authz.md` | Lines 5, 11, 54, 55: "Layer B", "Layer A" references | Remove all Layer A/B references. Reframe auth as product-owned. |
| `docs/SPEC-001-canonical-model.md` | Lines 5, 11, 29, 43: "Layer B", "Layer A events" | Remove Layer references. Posting rules are internal to the product, not cross-product. |
| `docs/SPEC-002-api-layer-b.md` | Title and throughout: "Layer B" | Rename to SPEC-002-api.md. Remove all Layer B framing. |
| `docs/SPEC-003-layer-a-to-layer-b.md` | **Entire document is structurally incorrect.** | Must be rewritten as a generic integration/event ingestion spec, not a Layer A→B contract. |
| `docs/SPEC-004-posting-rules.md` | Lines 5, 11, 23, 73, 82: "Layer A", "Layer B" | Remove cross-product references. Posting rules process events from the host product, not from "Layer A." |
| `docs/DAY5-HANDOFF.md` | Lines 41-42: "API Layer B", "Layer A ↔ B" | Update labels. |
| `package.json:4` | `"Layer B accounting core"` | **CODE — must be corrected in implementation.** |
| `src/main.ts:34` | `'Layer B - Accounting Core API'` | **CODE — must be corrected in implementation.** |

### Documents that are CLEAN (no correction needed)

| Document | Status |
|---|---|
| `docs/IMPLEMENTED-STATE-DAY1-TO-DAY4.md` | No Layer A/B references. Factual inventory. Clean. |

---

## F. OPEN DECISIONS — post-reset

### F.1 — Blocking (must resolve before Day 6)

| # | Decision | Impact |
|---|---|---|
| 1 | **Which product does this repo become?** | Determines domain, compliance boundary, and all subsequent schema work |
| 2 | **Repo strategy: monorepo, multirepo, or template-fork?** | Determines how the 3 products are organized at the code level |

### F.2 — Product-level (resolve per product, after F.1)

| # | Decision | Context |
|---|---|---|
| 3 | Compliance requirements for chosen product | HIPAA, OT regulations, or general fiscal — depends on F.1 |
| 4 | Event ingestion model | Each product defines how its host system sends financial events to its own financial module |
| 5 | Auth ownership | Each product owns its auth; decide JWT payload, roles, permissions per product |
| 6 | Decimal precision | May differ by product domain |
| 7 | Fiscal period model | May differ by product domain |
| 8 | Account structure / chart of accounts | Domain-specific |

### F.3 — Carried forward (still valid from Day 5)

All 42 OPEN DECISIONS from the previous Day 5 handoff remain open, but must now be interpreted as **per-product decisions**, not as decisions for a single "Layer B."

---

## G. What this document does NOT do

- Does not write code
- Does not create migrations
- Does not choose which product this repo becomes
- Does not define domain-specific schemas
- Does not invalidate the infrastructure work from Days 1–4 (that work is valid and product-agnostic)

---

## H. Summary

| Before | After |
|---|---|
| MA Finance Hub = Layer B of ChiroBill | MA Finance Hub = product family of 3 independent financial products |
| Fixed Layer A → Layer B event pipeline | Each product owns its own event ingestion |
| Single compliance boundary | 3 separate compliance boundaries (healthcare, industrial, general) |
| Centralized accounting core | No centralized core; independence is mandatory |
| Docs assume single product | Docs must be product-agnostic until repo identity is decided |

**Next action required:** Decide which product this repo becomes (OPEN DECISION F.1), then correct all affected documents and code references accordingly.
