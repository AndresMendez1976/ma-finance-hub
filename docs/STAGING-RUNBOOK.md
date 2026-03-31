# Staging Deployment Runbook

## Prerequisites

- VM with Docker + Docker Compose v2
- Git access to this repo
- SSH access to VM

## Initial Setup (first time)

```bash
# 1. Clone repo
git clone <repo-url> /opt/ma-finance-hub
cd /opt/ma-finance-hub

# 2. Generate staging env with real keys + random passwords
node scripts/generate-staging-env.js

# 3. Review and edit .env.staging
#    - Set CORS_ORIGINS to your staging domain
#    - Set PROXY_PORT if not 80
#    - Verify all passwords are changed from defaults
nano .env.staging

# 4. Build and start everything
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# 5. Wait for services (migrations run automatically)
docker compose -f docker-compose.staging.yml logs -f migrate

# 6. Create first admin user
docker compose -f docker-compose.staging.yml exec backend \
  node -e "
    const knex = require('knex')({client:'pg',connection:{host:'postgres',port:5432,database:'ma_finance_hub',user:process.env.DB_MIGRATION_USER,password:process.env.DB_MIGRATION_PASSWORD}});
    const bcrypt = require('bcryptjs');
    async function run() {
      const hash = await bcrypt.hash('ChangeMe123', 12);
      const [t] = await knex('tenants').insert({name:'My Company',slug:'my-company'}).returning('*');
      const pro = await knex('tiers').where({code:'pro'}).first();
      await knex('tenant_tiers').insert({tenant_id:t.id,tier_id:pro.id,is_active:true});
      const [u] = await knex('users').insert({external_subject:'admin',email:'admin@mycompany.com',display_name:'Admin',password_hash:hash}).returning('*');
      await knex('tenant_memberships').insert({tenant_id:t.id,user_id:u.id,role:'owner'});
      await knex('fiscal_periods').insert({tenant_id:t.id,fiscal_year:2026,fiscal_month:1,status:'open',opened_at:new Date()});
      console.log('Created tenant',t.id,'user',u.id);
      await knex.destroy();
    }
    run();
  "

# 7. Verify
curl http://localhost/health
curl http://localhost/ready
```

## Update Deployment

```bash
cd /opt/ma-finance-hub
git pull

# Backup before update
./scripts/backup-db.sh docker-compose.staging.yml

# Rebuild and restart
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build

# Migrations run automatically via migrate service
docker compose -f docker-compose.staging.yml logs migrate
```

## Run Migrations Manually

```bash
docker compose -f docker-compose.staging.yml run --rm migrate
```

## Backup

```bash
./scripts/backup-db.sh docker-compose.staging.yml
# Output: ./backups/ma_finance_hub_YYYYMMDD_HHMMSS.sql.gz
```

## Restore

```bash
./scripts/restore-db.sh ./backups/ma_finance_hub_YYYYMMDD_HHMMSS.sql.gz docker-compose.staging.yml
# Then re-run migrations:
docker compose -f docker-compose.staging.yml run --rm migrate
```

## Health Checks

```bash
# Backend
curl http://localhost/health
# Expected: {"status":"ok"}

curl http://localhost/ready
# Expected: {"status":"ok","db":"connected","redis":"connected","timestamp":"..."}

# Frontend
curl -o /dev/null -w "%{http_code}" http://localhost/login
# Expected: 200

# Login test
curl -X POST http://localhost/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mycompany.com","password":"ChangeMe123","tenant_id":1}'
# Expected: {"token":"eyJ..."}
```

## Logs

```bash
# All services
docker compose -f docker-compose.staging.yml logs -f

# Specific service
docker compose -f docker-compose.staging.yml logs -f backend
docker compose -f docker-compose.staging.yml logs -f frontend
docker compose -f docker-compose.staging.yml logs -f postgres
```

## Stop / Start

```bash
# Stop
docker compose -f docker-compose.staging.yml down

# Start (without rebuild)
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# Full reset (destroys data)
docker compose -f docker-compose.staging.yml down -v
```

## Troubleshooting

| Symptom | Check |
|---|---|
| 502 Bad Gateway | `docker compose logs backend` — is it running? |
| Login fails | Check JWT keys in .env.staging match |
| Migrations fail | `docker compose logs migrate` |
| Redis not connected | `docker compose exec redis redis-cli ping` |
| DB connection refused | `docker compose exec postgres pg_isready` |
