import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Helper: returns current subject from session setting (pool-safe).
  await knex.raw(`
    CREATE OR REPLACE FUNCTION app_current_subject()
    RETURNS text AS $$
      SELECT nullif(current_setting('app.current_subject', true), '');
    $$ LANGUAGE sql STABLE
  `);

  // ── RLS on users ──
  // app_user can only see their own user record (matched by external_subject).
  // No INSERT/UPDATE/DELETE — user provisioning is admin-only via migration_user.
  await knex.raw('ALTER TABLE users ENABLE ROW LEVEL SECURITY');

  await knex.raw(`
    CREATE POLICY user_self_select ON users
      FOR SELECT TO app_user
      USING (external_subject = app_current_subject())
  `);

  // ── RLS on tenant_memberships ──
  // app_user can only see memberships for the current tenant AND their own user.
  // No INSERT/UPDATE/DELETE — membership management is admin-only via migration_user.
  await knex.raw('ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY');

  await knex.raw(`
    CREATE POLICY membership_tenant_select ON tenant_memberships
      FOR SELECT TO app_user
      USING (
        tenant_id = app_current_tenant_id()
        AND user_id = (
          SELECT id FROM users WHERE external_subject = app_current_subject()
        )
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS membership_tenant_select ON tenant_memberships');
  await knex.raw('ALTER TABLE tenant_memberships DISABLE ROW LEVEL SECURITY');

  await knex.raw('DROP POLICY IF EXISTS user_self_select ON users');
  await knex.raw('ALTER TABLE users DISABLE ROW LEVEL SECURITY');

  await knex.raw('DROP FUNCTION IF EXISTS app_current_subject()');
}
