# MA Finance Hub — Changelog

## v1.0.0 — Complete ERP Platform

### Core Accounting
- General Ledger with GAAP Chart of Accounts (26 standard accounts)
- Journal Entries with double-entry bookkeeping (immutable)
- Fiscal Periods with lock date enforcement
- Posting Rules for automated entries
- Tracking Dimensions (Class/Location/Department) on journal lines

### Financial Reports
- Balance Sheet (with PDF export)
- Income Statement / P&L (with PDF export)
- Cash Flow Statement (with PDF export)
- Trial Balance (with PDF export)
- Aged Receivables (with PDF/CSV export)
- Aged Payables (with PDF/CSV export)
- Budget vs Actual with variance analysis
- Financial Forecasting (linear regression)
- Financial Ratios (liquidity, profitability, efficiency, leverage)

### Invoicing & Billing
- Invoices with PDF generation and MAiSHQ branding
- Estimates/Quotes with send, accept, reject, convert-to-invoice
- Recurring Invoices (weekly/biweekly/monthly/quarterly/annually)
- Credit Notes & Refunds with journal entries
- Shipping charges and discount lines (percentage/fixed)
- Client Portal (public, no-login access via token)
- 1099 vendor tracking with IRS threshold detection

### Vendor Bills & Expenses
- Vendor Bills (AP) with partial payments and aging
- Expense Tracking with approval workflow
- Recurring Expenses (auto-generation on schedule)
- Mileage Tracking with IRS standard rate ($0.70/mile)
- Bill Payments with bank account linkage

### Procurement
- Purchase Orders with lifecycle (draft → sent → received)
- PO Receipts with quantity tracking
- PO to Expense conversion

### Banking
- Bank Accounts with balance tracking
- Bank Transactions with CSV import
- Manual Reconciliation
- Bank Rules for auto-categorization

### Inventory Management
- Products (inventory/non-inventory/service types)
- Three costing methods: FIFO, LIFO, Average Cost
- Lot tracking and serial number support
- Multi-location inventory
- Inventory Adjustments with journal entries
- Inventory Transfers between locations
- Inventory Valuation report
- Stock Status with reorder alerts

### Manufacturing
- Bill of Materials (components, labor, overhead)
- Work Orders with lifecycle management
- Material consumption tracking
- Labor cost tracking
- Production cost and variance analysis
- BOM cost analysis

### Payroll
- Employee Management with tax information
- Pay Runs (draft → calculated → approved → posted)
- Federal tax bracket calculations
- FICA (Social Security 6.2% + Medicare 1.45%)
- FUTA (0.6% on first $7,000) and SUTA
- State income tax (configurable)
- Pre-tax and post-tax deductions
- Journal entry posting

### Fixed Assets & Equipment
- Asset tracking with depreciation (straight-line, declining balance)
- Asset disposal with gain/loss journal entries
- Maintenance management (preventive/corrective/inspection)
- Maintenance schedules with frequency-based generation
- Equipment tracking with hourly/daily rates
- Equipment usage logging and utilization reporting

### Project Management & Time Tracking
- Projects with budget tracking (fixed price/hourly/non-billable)
- Time entries with timer and manual entry
- Timesheet weekly view
- Time entry billing to invoices
- Project profitability reports
- Project expense linking

### Job Costing (Construction/Manufacturing)
- Cost Codes with hierarchical categories
- Job Cost Entries from multiple sources
- Unit Price Analysis for unit-price contracts
- Change Orders with approval workflow
- Progress Billing (AIA G702/G703 style)
- Earned Value Analysis (BCWS, BCWP, ACWP, SPI, CPI, EAC, ETC)
- Work in Progress (WIP) Report
- Job Cost Detail Report

### CRM
- Sales Pipeline with Kanban board
- Opportunity management (move, win, lose)
- Activity tracking (calls, emails, meetings, tasks, notes)
- Pipeline funnel dashboard with KPIs
- Win rate and average deal size analytics
- Auto-invoice creation on deal close

### Multi-Currency
- 10 currencies seeded (USD, EUR, GBP, MXN, CAD, JPY, CHF, AUD, BRL, CNY)
- Exchange rate management
- Currency support on invoices, expenses, purchase orders

### Sales Tax
- Tax rates by jurisdiction
- Compound tax components (federal/state/county/city/district)
- Per-line tax overrides
- Auto-calculation on invoices, expenses, POs

### Custom Fields
- Unlimited custom fields per entity type
- Field types: text, number, date, boolean, select
- Supported on: contacts, invoices, expenses, products, POs, projects, employees, fixed assets

### Budgets
- Annual/quarterly/monthly budgets
- Budget lines by account and period
- Budget vs Actual comparison with variance
- Linear regression forecasting

### Notifications
- In-app notification system
- Auto-triggers: overdue invoices, low stock, maintenance due, payroll reminder
- Email templates (6) with MAiSHQ branding

### Security
- MFA (TOTP) with QR code setup and backup codes
- AES-256-GCM encryption for secrets
- Password policy (10+ chars, complexity requirements)
- Account lockout (progressive: 15min → 1hr → 24hr)
- JWT RS256 with refresh token rotation and reuse detection
- Row Level Security (RLS) on all tables
- RBAC with 5 roles (owner/admin/manager/analyst/viewer)
- Rate limiting via Redis
- Helmet security headers (HSTS, CSP, X-Frame-Options)
- Audit log (append-only, all write operations)
- Input validation (class-validator)

### Multi-Tenant
- Complete tenant isolation via PostgreSQL RLS
- Three DB roles: postgres, migration_user, app_user
- Tier-based feature gating (Starter/Professional/Business/Enterprise)
- 14-day free trial with full access

### User Management
- Internal users with role assignment
- External users (accountant/attorney/auditor/consultant)
- Invitation system with UUID tokens
- External access logging
- Configurable permissions per external user
- Access expiration for external users

### Multi-Company
- Company groups for managing multiple tenants
- Consolidated dashboard across companies
- Quick switching between companies

### API & Integration
- REST API with 410+ endpoints
- Swagger/OpenAPI documentation
- API Keys with HMAC authentication
- Webhooks with HMAC-SHA256 signatures

### Data Management
- Batch operations (invoices, expenses, contacts, products)
- CSV import/export for contacts, products, invoices, expenses
- Full data export (all tenant tables)
- Tenant data deletion with password confirmation

### PWA
- Installable Progressive Web App
- Service worker with offline caching
- Network-first API calls with cache fallback

### Public Pages
- Landing page with feature overview
- Pricing page (4 SaaS tiers + standalone licenses)
- Registration with 14-day trial
- About page
- Legal pages (Terms, Privacy, Disclaimer)

### Legal Disclaimers
- Payroll tax calculation disclaimer
- Financial report audit disclaimer
- Invoice PDF legal notice
- Registration terms acknowledgment
- Dedicated disclaimer page

---

**Stats:** 64 migrations | 410+ endpoints | 129 frontend pages | 45 backend modules

**Stack:** NestJS 10 + TypeScript + Knex + PostgreSQL 16 + Redis 7 + Next.js 14 + Docker

**Company:** MA Intelligent Systems LLC (MAiSHQ) — Odessa, TX
