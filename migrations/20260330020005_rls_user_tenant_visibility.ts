import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create a SECURITY DEFINER function that bypasses RLS to check
  // if a user_id has a membership in a given tenant.
  // This avoids infinite recursion between users and tenant_memberships RLS policies.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION is_tenant_member(p_user_id bigint, p_tenant_id bigint)
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER
  `);

  // Allow app_user to see users who are members of the current tenant.
  // Uses the SECURITY DEFINER function to avoid RLS recursion.
  await knex.raw(`
    CREATE POLICY user_tenant_member_select ON users
      FOR SELECT TO app_user
      USING (is_tenant_member(id, app_current_tenant_id()))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS user_tenant_member_select ON users');
  await knex.raw('DROP FUNCTION IF EXISTS is_tenant_member(bigint, bigint)');
}
