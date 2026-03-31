# MA Finance Hub

Multi-tenant finance platform. Product of MAiSHQ. Domain: maishq.com.

## Stack
- **Backend**: NestJS 10 + TypeScript, Knex + PostgreSQL 16, Redis 7, JWT (RSA)
- **Frontend**: Next.js 14 (App Router) + Tailwind + Radix/shadcn
- **Infra**: Docker Compose, nginx reverse proxy, Cloudflare TLS, single VM deployment

## Key paths
- Backend source: `src/`
- Frontend source: `frontend/src/`
- Migrations: `migrations/` (Knex, run by `migration_user`)
- Deploy configs: `deploy/` (Caddyfile, nginx.conf)
- Scripts: `scripts/` (vm-deploy, vm-update, backup, restore, env gen)
- Docker: `docker-compose.vm.yml` (VM/prod), `docker-compose.prod.yml` (Caddy alt), `docker-compose.yml` (dev)

## Commands
```bash
npm run build            # Backend build
npm run typecheck        # Type check backend
npm run lint             # Lint backend
npm run test:integration # Integration tests
npm run migrate:latest   # Run migrations (needs DB)
cd frontend && npm run build  # Frontend build
```

## Database
- Three roles: postgres (superuser), migration_user (DDL), app_user (DML only)
- RLS enforced for tenant isolation
- 27 migrations covering schema, RLS, tiers, sessions, immutability

## Auth
- JWT with RSA key pair
- Login via email/password + tenant_id
- Roles: owner, admin, manager, user
- Sessions tracked in Redis

## Deploy to VM
```bash
./scripts/vm-deploy.sh     # First deploy
./scripts/vm-update.sh     # Update
./scripts/vm-status.sh     # Check status
./scripts/vm-seed-demo.sh  # Create demo user
./scripts/vm-backup.sh     # Backup DB
```

## Demo user
- Email: admin@demo.com
- Password: Demo1234!
- Tenant: Demo Company (id=1)
- Role: owner, Tier: Pro
