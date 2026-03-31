import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // SECURITY DEFINER function to look up user by email for login
  // Bypasses RLS safely — only returns minimal data needed for auth
  await knex.raw(`
    CREATE OR REPLACE FUNCTION find_user_for_login(p_email text)
    RETURNS TABLE(id bigint, external_subject text, password_hash text, is_active boolean) AS $$
      SELECT u.id, u.external_subject::text, u.password_hash::text, u.is_active
      FROM public.users u
      WHERE u.email = p_email AND u.password_hash IS NOT NULL
      LIMIT 1;
    $$ LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
  `);

  // SECURITY DEFINER function to check tenant membership for login
  await knex.raw(`
    CREATE OR REPLACE FUNCTION find_membership_for_login(p_user_id bigint, p_tenant_id bigint)
    RETURNS TABLE(id bigint, role text, is_active boolean) AS $$
      SELECT tm.id, tm.role::text, tm.is_active
      FROM public.tenant_memberships tm
      WHERE tm.user_id = p_user_id AND tm.tenant_id = p_tenant_id
      LIMIT 1;
    $$ LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION IF EXISTS find_membership_for_login(bigint, bigint)');
  await knex.raw('DROP FUNCTION IF EXISTS find_user_for_login(text)');
}
