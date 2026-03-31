import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Helper: checks if the current session is an internal/system operation
  await knex.raw(`
    CREATE OR REPLACE FUNCTION is_internal_operation()
    RETURNS boolean AS $$
      SELECT current_setting('app.internal_operation', true) = 'true';
    $$ LANGUAGE sql STABLE
    SET search_path = public
  `);

  // Allow internal operations to manage tenant_tiers without user identity
  await knex.raw(`
    CREATE POLICY tenant_tier_internal_insert ON tenant_tiers
      FOR INSERT TO app_user
      WITH CHECK (is_internal_operation())
  `);

  await knex.raw(`
    CREATE POLICY tenant_tier_internal_update ON tenant_tiers
      FOR UPDATE TO app_user
      USING (is_internal_operation())
      WITH CHECK (is_internal_operation())
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS tenant_tier_internal_update ON tenant_tiers');
  await knex.raw('DROP POLICY IF EXISTS tenant_tier_internal_insert ON tenant_tiers');
  await knex.raw('DROP FUNCTION IF EXISTS is_internal_operation()');
}
