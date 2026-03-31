import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Helper: checks if the current session user is owner/admin of the current tenant.
  // SECURITY DEFINER with pinned search_path to avoid privilege escalation.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION is_current_tenant_admin()
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships tm
        JOIN public.users u ON u.id = tm.user_id
        WHERE tm.tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::bigint
          AND u.external_subject = nullif(current_setting('app.current_subject', true), '')
          AND tm.role IN ('owner', 'admin')
          AND tm.is_active = true
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
  `);

  // ── Fix users policies ──

  // DROP the open INSERT policy
  await knex.raw('DROP POLICY IF EXISTS user_admin_insert ON users');

  // New: only owner/admin can INSERT users
  await knex.raw(`
    CREATE POLICY user_admin_insert ON users
      FOR INSERT TO app_user
      WITH CHECK (is_current_tenant_admin())
  `);

  // DROP the open tenant member SELECT policy
  await knex.raw('DROP POLICY IF EXISTS user_tenant_member_select ON users');

  // New: only owner/admin can see all tenant members
  await knex.raw(`
    CREATE POLICY user_tenant_member_select ON users
      FOR SELECT TO app_user
      USING (
        is_current_tenant_admin()
        AND is_tenant_member(id, app_current_tenant_id())
      )
  `);

  // user_self_select stays unchanged — everyone can see themselves

  // ── Fix tenant_memberships policies ──

  // DROP the open admin SELECT policy
  await knex.raw('DROP POLICY IF EXISTS membership_admin_select ON tenant_memberships');

  // New: only owner/admin can see all tenant memberships
  await knex.raw(`
    CREATE POLICY membership_admin_select ON tenant_memberships
      FOR SELECT TO app_user
      USING (
        tenant_id = app_current_tenant_id()
        AND is_current_tenant_admin()
      )
  `);

  // membership_tenant_select stays — users can see their OWN membership

  // DROP the open admin INSERT policy
  await knex.raw('DROP POLICY IF EXISTS membership_admin_insert ON tenant_memberships');

  // New: only owner/admin can insert memberships
  await knex.raw(`
    CREATE POLICY membership_admin_insert ON tenant_memberships
      FOR INSERT TO app_user
      WITH CHECK (
        tenant_id = app_current_tenant_id()
        AND is_current_tenant_admin()
      )
  `);

  // DROP the open admin UPDATE policy
  await knex.raw('DROP POLICY IF EXISTS membership_admin_update ON tenant_memberships');

  // New: only owner/admin can update memberships
  await knex.raw(`
    CREATE POLICY membership_admin_update ON tenant_memberships
      FOR UPDATE TO app_user
      USING (
        tenant_id = app_current_tenant_id()
        AND is_current_tenant_admin()
      )
      WITH CHECK (
        tenant_id = app_current_tenant_id()
        AND is_current_tenant_admin()
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Restore open policies
  await knex.raw('DROP POLICY IF EXISTS membership_admin_update ON tenant_memberships');
  await knex.raw(`CREATE POLICY membership_admin_update ON tenant_memberships FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);

  await knex.raw('DROP POLICY IF EXISTS membership_admin_insert ON tenant_memberships');
  await knex.raw(`CREATE POLICY membership_admin_insert ON tenant_memberships FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);

  await knex.raw('DROP POLICY IF EXISTS membership_admin_select ON tenant_memberships');
  await knex.raw(`CREATE POLICY membership_admin_select ON tenant_memberships FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);

  await knex.raw('DROP POLICY IF EXISTS user_tenant_member_select ON users');
  await knex.raw(`CREATE POLICY user_tenant_member_select ON users FOR SELECT TO app_user USING (is_tenant_member(id, app_current_tenant_id()))`);

  await knex.raw('DROP POLICY IF EXISTS user_admin_insert ON users');
  await knex.raw(`CREATE POLICY user_admin_insert ON users FOR INSERT TO app_user WITH CHECK (true)`);

  await knex.raw('DROP FUNCTION IF EXISTS is_current_tenant_admin()');
}
