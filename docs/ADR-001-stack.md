# ADR-001: Technology Stack

**Status:** Approved and implemented
**Date:** 2026-03-29
**Applies to:** MA Finance Hub — Finance SaaS / Standalone Platform

---

## Context

MA Finance Hub is a standalone financial platform for accounting, administration, and finance. It is one of 3 independent financial products in the MA product family (see ARCHITECTURE-RESET.md). This product has no runtime dependency on the other two (Healthcare Financial Compliance Module, Industrial Financial Impact Module). The stack must support multi-tenant isolation, strict data integrity, multi-user concurrent access, and updatable regulatory/fiscal rules.

## Decision

### Runtime

| Component | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | >=22.0.0 | LTS, enforced via `engines` in package.json |
| Language | TypeScript | 5.6.3 | Strict mode enabled |
| Framework | NestJS | 10.4.15 | Modular architecture, DI, lifecycle hooks |
| HTTP platform | Express (via @nestjs/platform-express) | 10.4.15 | Default NestJS adapter |

### Database

| Component | Choice | Version | Notes |
|---|---|---|---|
| RDBMS | PostgreSQL | 16 (Alpine) | Containerized via Docker Compose |
| Query builder / migrations | Knex.js | 3.1.0 | Raw SQL control, no ORM abstraction |
| Driver | pg | 8.13.1 | Native PostgreSQL driver for Node.js |

### Security & middleware

| Component | Choice | Version |
|---|---|---|
| HTTP headers | helmet | 7.2.0 |
| Compression | compression | 1.7.5 |
| Validation | class-validator + class-transformer | 0.14.1 / 0.5.1 |
| Config validation | Joi | 17.13.3 |
| Auth (planned) | Passport + passport-jwt | 0.7.0 / 4.0.1 |
| JWT (planned) | jsonwebtoken | 9.0.2 |

### API documentation

| Component | Choice | Version |
|---|---|---|
| Swagger | @nestjs/swagger | 7.4.2 |
| Toggle | `SWAGGER_ENABLED` env var | Disabled in production |

### Testing

| Component | Choice | Version |
|---|---|---|
| Test runner | Jest | 29.7.0 |
| TS transform | ts-jest | 29.2.5 |
| HTTP testing | supertest | 6.3.4 |
| Integration DB | testcontainers + @testcontainers/postgresql | 10.16.0 |

### Build & tooling

| Component | Choice | Version |
|---|---|---|
| CLI | @nestjs/cli | 10.4.9 |
| Linting | ESLint + @typescript-eslint | 8.57.1 / 7.18.0 |
| Formatting | Prettier | 3.4.2 |
| Dev keys | Node.js script (crypto module) | Portable, no Bash/OpenSSL dependency |

### Infrastructure

| Component | Choice | Notes |
|---|---|---|
| Container orchestration | Docker Compose v2+ | No `version` field (modern format) |
| DB provisioning | docker-entrypoint-initdb.d | Role setup via SQL init script |

## Tradeoffs

| Decision | Tradeoff |
|---|---|
| Knex over Prisma/TypeORM | More control over SQL and migrations; less abstraction convenience |
| bigint PK over UUID | No dependency on pgcrypto extension; sequential, index-friendly; less portable for distributed ID generation |
| Pinned dependency versions | Reproducible builds; requires manual updates |
| `incremental: false` in tsconfig.build.json | Prevents stale tsbuildinfo bugs; slightly slower builds |
| Portable Node.js scripts over Bash | Works on Windows/macOS/Linux; slightly more verbose |

## Consequences

- All dependencies are pinned to exact versions (no `^` or `~`).
- Database migrations run as `migration_user` with schema-level privileges only.
- Application runtime connects as `app_user` with DML-only privileges.
- Build produces CommonJS output to `./dist`.
