import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Allow app_user to INSERT users — authorization is enforced at the application
  // layer via RBAC (only owner/admin can call admin endpoints).
  // Users are global (not tenant-scoped), so no tenant_id check.
  await knex.raw(`
    CREATE POLICY user_admin_insert ON users
      FOR INSERT TO app_user
      WITH CHECK (true)
  `);

  // Allow app_user to INSERT tenant_memberships for the current tenant only.
  await knex.raw(`
    CREATE POLICY membership_admin_insert ON tenant_memberships
      FOR INSERT TO app_user
      WITH CHECK (tenant_id = app_current_tenant_id())
  `);

  // Allow app_user to UPDATE tenant_memberships for the current tenant only.
  await knex.raw(`
    CREATE POLICY membership_admin_update ON tenant_memberships
      FOR UPDATE TO app_user
      USING (tenant_id = app_current_tenant_id())
      WITH CHECK (tenant_id = app_current_tenant_id())
  `);

  // Allow admin to list memberships for current tenant (select other users' memberships)
  await knex.raw(`
    CREATE POLICY membership_admin_select ON tenant_memberships
      FOR SELECT TO app_user
      USING (tenant_id = app_current_tenant_id())
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS membership_admin_select ON tenant_memberships');
  await knex.raw('DROP POLICY IF EXISTS membership_admin_update ON tenant_memberships');
  await knex.raw('DROP POLICY IF EXISTS membership_admin_insert ON tenant_memberships');
  await knex.raw('DROP POLICY IF EXISTS user_admin_insert ON users');
}
