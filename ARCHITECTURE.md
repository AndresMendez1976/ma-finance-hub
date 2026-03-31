# MA Finance Hub — Architecture Document

## System Overview

MA Finance Hub is a multi-tenant SaaS ERP platform built for small and medium businesses.
Product of MA Intelligent Systems LLC (MAiSHQ), based in Odessa, TX.

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENTS                                   │
│  Next.js 14 (Browser)  │  Mobile (PWA)  │  API Consumers     │
└───────────┬──────────────────────┬───────────────┬───────────┘
            │         HTTPS/TLS (Cloudflare)       │
┌───────────▼──────────────────────▼───────────────▼───────────┐
│                   NGINX Reverse Proxy                         │
│              (SSL termination, static files)                  │
└───────────┬──────────────────────┬───────────────────────────┘
            │                      │
┌───────────▼──────────┐ ┌────────▼─────────────────────┐
│   Next.js 14 App     │ │     NestJS 10 API Server      │
│   (App Router, SSR)  │ │  ┌─────────────────────────┐  │
│   Port: 3001         │ │  │ Guards: JWT + RLS + RBAC │  │
│                      │ │  │ MFA TOTP Enforcement     │  │
│  - Public Pages      │ │  │ Rate Limiting (Redis)    │  │
│  - Dashboard App     │ │  └─────────────────────────┘  │
│  - PWA Offline       │ │  ┌─────────────────────────┐  │
│  - Portal (Public)   │ │  │ 38+ Feature Modules     │  │
│                      │ │  │ 300+ REST Endpoints     │  │
│                      │ │  │ Swagger/OpenAPI Docs    │  │
│                      │ │  └─────────────────────────┘  │
│                      │ │  Port: 3000                   │
└──────────────────────┘ └───────────┬──────┬────────────┘
                                     │      │
                          ┌──────────▼┐  ┌──▼──────────┐
                          │PostgreSQL │  │   Redis 7   │
                          │   16      │  │             │
                          │           │  │ - Sessions  │
                          │ - RLS     │  │ - Cache     │
                          │ - 55+ tbl │  │ - Rate Lim  │
                          │ - Indexes │  │ - Bull Jobs │
                          │ - Audit   │  │             │
                          └───────────┘  └─────────────┘
```

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend | Next.js | 14 | App Router, SSR, PWA |
| UI | Tailwind CSS + Radix/shadcn | 3.4 | Component library |
| Charts | Recharts | 3.8 | Dashboard visualizations |
| Backend | NestJS | 10 | REST API framework |
| Language | TypeScript | 5.6 | Type safety |
| Database | PostgreSQL | 16 | Primary data store |
| Query Builder | Knex | 3.1 | SQL query builder |
| Cache | Redis | 7 | Sessions, rate limiting, jobs |
| Auth | JWT (RS256) | - | Stateless authentication |
| MFA | otplib + QRCode | - | TOTP two-factor auth |
| PDF | PDFKit | 0.18 | Invoice/estimate generation |
| Deploy | Docker Compose | - | Container orchestration |
| Proxy | Nginx | - | Reverse proxy, TLS |
| CDN/WAF | Cloudflare | - | DDoS protection, TLS |

## Security Model

### Authentication
- JWT with RS256 key pair (asymmetric)
- Access tokens: 15min expiry (with refresh rotation)
- Refresh tokens: 7-day expiry with rotation and reuse detection
- MFA (TOTP): Required for owner/admin roles, configurable grace period

### Authorization (RBAC)
- 5 roles: owner > admin > manager > analyst > viewer
- Decorator-based: @Roles('owner', 'admin', 'manager')
- Tier-based feature gating: @RequiresEntitlement('feature.X')

### Tenant Isolation (RLS)
- PostgreSQL Row Level Security on ALL tables
- SET LOCAL app.current_tenant_id per transaction
- Three DB roles: postgres (superuser), migration_user (DDL), app_user (DML only)
- Zero data leakage between tenants at DB level

### Additional Security
- Password policy: min 10 chars, upper/lower/number/special
- Account lockout: 5/10/20 attempts → 15min/1hr/24hr lock
- Rate limiting: 100 req/min default, 5 req/min for login
- Helmet security headers (HSTS, CSP, X-Frame-Options)
- Audit log: append-only, records all write operations
- Input validation: class-validator on all DTOs
- SQL injection prevention: Knex parameterized queries
- AES-256-GCM encryption for MFA secrets

## Database Model (55+ tables)

### Core
- tenants, users, tenant_memberships, active_sessions
- tiers, tier_entitlements

### Accounting
- chart_of_accounts, accounts, fiscal_periods
- journal_entries, journal_lines (immutable)
- posting_rules

### Billing
- invoices, invoice_lines
- estimates, estimate_lines
- recurring_invoices, recurring_invoice_lines
- expenses

### Procurement
- purchase_orders, purchase_order_lines
- purchase_order_receipts, purchase_order_receipt_lines
- contacts

### Inventory
- products, inventory_locations, inventory_lots
- inventory_transactions (immutable, FIFO/LIFO/AvgCost)
- inventory_adjustments, inventory_adjustment_lines
- inventory_transfers, inventory_transfer_lines

### Manufacturing
- bill_of_materials, bom_lines, bom_labor, bom_overhead
- work_orders, work_order_material_usage, work_order_labor

### Payroll
- employees, payroll_runs, payroll_items
- payroll_deduction_types, employee_deductions

### Fixed Assets
- fixed_assets, depreciation_entries
- maintenance_records, maintenance_schedules

### Banking
- bank_accounts, bank_transactions, bank_rules

### CRM
- crm_pipelines, crm_stages, crm_opportunities, crm_activities

### Projects
- projects, time_entries, project_expenses

### Multi-Currency & Tax
- currencies, exchange_rates
- tax_rates, tax_rate_components

### Budgets
- budgets, budget_lines

### Configuration
- tenant_settings, tracking_dimensions, tracking_values
- custom_field_definitions, custom_field_values
- notifications, api_keys, webhooks
- client_portal_tokens, invitations
- refresh_tokens, external_access_log
- audit_log (append-only)

## Pricing Tiers

| Feature | Starter $29 | Professional $79 | Business $149 | Enterprise $299 |
|---------|:-----------:|:-----------------:|:-------------:|:---------------:|
| Users | 1 | 5 + 3 external | 15 + 10 ext | Unlimited |
| GL + Reports | ✅ | ✅ | ✅ | ✅ |
| Invoicing | ✅ | ✅ | ✅ | ✅ |
| Estimates | ✅ | ✅ | ✅ | ✅ |
| Expenses | ✅ | ✅ | ✅ | ✅ |
| Banking | ✅ | ✅ | ✅ | ✅ |
| Inventory | - | ✅ | ✅ | ✅ |
| CRM | - | ✅ | ✅ | ✅ |
| Projects | - | ✅ | ✅ | ✅ |
| Recurring Inv | - | ✅ | ✅ | ✅ |
| Client Portal | - | ✅ | ✅ | ✅ |
| Bank Rules | - | ✅ | ✅ | ✅ |
| Payroll | - | - | ✅ | ✅ |
| Manufacturing | - | - | ✅ | ✅ |
| Fixed Assets | - | - | ✅ | ✅ |
| Multi-Currency | - | - | ✅ | ✅ |
| Budgets | - | - | ✅ | ✅ |
| Custom Fields | - | - | ✅ | ✅ |
| Batch Ops | - | - | ✅ | ✅ |
| Webhooks | - | - | ✅ | ✅ |
| API Access | - | - | - | ✅ |
| Data Export | - | - | ✅ | ✅ |
| Audit Log View | - | - | ✅ | ✅ |

## Infrastructure Roadmap

### Phase 1: Single Server (current — up to 1,000 users)
- Single VM with Docker Compose
- PostgreSQL + Redis on same VM
- Nginx reverse proxy
- Cloudflare for CDN/WAF/TLS
- Automated backups to S3

### Phase 2: Scalable Cloud (up to 100,000 users)
- AWS RDS Aurora PostgreSQL (multi-AZ, read replicas)
- AWS ElastiCache Redis cluster
- ECS Fargate or EC2 Auto Scaling Group
- Application Load Balancer
- S3 for file storage (PDFs, attachments)
- SES for transactional email
- CloudWatch for monitoring
- CI/CD with GitHub Actions → ECR → ECS

### Phase 3: Enterprise Scale (up to 10M users)
- Consider microservices decomposition
- Event-driven architecture (SQS/SNS)
- Dedicated DB per large tenant (optional)
- Global deployment with Route 53
- Data warehouse for analytics (Redshift/BigQuery)
- Real-time features with WebSockets

## Deployment

```bash
# First deploy to VM
./scripts/vm-deploy.sh

# Update existing deployment
./scripts/vm-update.sh

# Seed demo data
./scripts/vm-seed-demo.sh
./scripts/vm-seed-full-demo.sh

# Backup/restore
./scripts/vm-backup.sh
./scripts/vm-restore.sh

# Check status
./scripts/vm-status.sh
```

## Contact

- Product: MA Finance Hub
- Company: MA Intelligent Systems LLC (MAiSHQ)
- Location: Odessa, TX
- Website: maishq.com
- Support: support@maishq.com
- Sales: sales@maishq.com
