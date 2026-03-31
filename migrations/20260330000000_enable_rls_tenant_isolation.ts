import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Helper function: returns current tenant_id from session setting.
  // Returns NULL if not set, which causes all RLS policies to deny access (safe default).
  await knex.raw(`
    CREATE OR REPLACE FUNCTION app_current_tenant_id()
    RETURNS bigint AS $$
      SELECT nullif(current_setting('app.current_tenant_id', true), '')::bigint;
    $$ LANGUAGE sql STABLE
  `);

  // ── RLS on tenants ──
  await knex.raw('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY');
  // RLS is NOT forced on table owner (migration_user) — owner exemption is intentional.
  // migration_user needs unrestricted access for migrations and admin operations.
  // RLS is enforced on app_user via per-role policies below.

  // app_user can only see their own tenant
  await knex.raw(`
    CREATE POLICY tenant_isolation_select ON tenants
      FOR SELECT TO app_user
      USING (id = app_current_tenant_id())
  `);

  // app_user can update only their own tenant
  await knex.raw(`
    CREATE POLICY tenant_isolation_update ON tenants
      FOR UPDATE TO app_user
      USING (id = app_current_tenant_id())
      WITH CHECK (id = app_current_tenant_id())
  `);

  // No INSERT or DELETE policies for app_user on tenants — denied by default.

  // ── RLS on fiscal_periods ──
  await knex.raw('ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY');
  // Same: no FORCE — migration_user (owner) is exempt, app_user is restricted.

  await knex.raw(`
    CREATE POLICY tenant_isolation_select ON fiscal_periods
      FOR SELECT TO app_user
      USING (tenant_id = app_current_tenant_id())
  `);

  await knex.raw(`
    CREATE POLICY tenant_isolation_insert ON fiscal_periods
      FOR INSERT TO app_user
      WITH CHECK (tenant_id = app_current_tenant_id())
  `);

  await knex.raw(`
    CREATE POLICY tenant_isolation_update ON fiscal_periods
      FOR UPDATE TO app_user
      USING (tenant_id = app_current_tenant_id())
      WITH CHECK (tenant_id = app_current_tenant_id())
  `);

  await knex.raw(`
    CREATE POLICY tenant_isolation_delete ON fiscal_periods
      FOR DELETE TO app_user
      USING (tenant_id = app_current_tenant_id())
  `);
}

export async function down(knex: Knex): Promise<void> {
  // fiscal_periods policies
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON fiscal_periods');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON fiscal_periods');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON fiscal_periods');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON fiscal_periods');
  await knex.raw('ALTER TABLE fiscal_periods DISABLE ROW LEVEL SECURITY');

  // tenants policies
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON tenants');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON tenants');
  await knex.raw('ALTER TABLE tenants DISABLE ROW LEVEL SECURITY');

  await knex.raw('DROP FUNCTION IF EXISTS app_current_tenant_id()');
}
