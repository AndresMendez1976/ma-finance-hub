-- =============================================================
-- MA Finance Hub - Database Role Setup (Administrative Step)
-- =============================================================
-- This script runs ONCE during initial PostgreSQL provisioning.
-- It is NOT a Knex migration. It is an administrative setup step
-- executed by the PostgreSQL superuser (postgres) via
-- docker-entrypoint-initdb.d on first container start.
--
-- Roles defined per ADR-002 section 6.3 (Minimum Privilege Model):
--   app_user       — application runtime (NestJS connects as this)
--   migration_user — schema management (Knex migrations run as this)
-- =============================================================

-- ── app_user ──
-- Strictly application-level privileges.
-- No CREATE, ALTER, DROP, TRUNCATE.
-- No SUPERUSER, CREATEDB, CREATEROLE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_password_dev';
  END IF;
END
$$;

-- ── migration_user ──
-- Schema management privileges for Knex migrations.
-- Can CREATE/ALTER/DROP tables, indexes, policies, triggers, functions.
-- Can GRANT/REVOKE on objects.
-- NOT superuser.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'migration_user') THEN
    CREATE ROLE migration_user LOGIN PASSWORD 'migration_password_dev';
  END IF;
END
$$;

-- Grant migration_user the ability to create objects in the public schema
GRANT ALL ON SCHEMA public TO migration_user;

-- Grant migration_user the ability to grant permissions to app_user
GRANT app_user TO migration_user;

-- Grant app_user basic connect and usage
GRANT CONNECT ON DATABASE ma_finance_hub TO app_user;
GRANT CONNECT ON DATABASE ma_finance_hub TO migration_user;
GRANT USAGE ON SCHEMA public TO app_user;
