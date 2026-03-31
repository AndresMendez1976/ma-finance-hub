import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Allow owners/admins to manage their tenant's tier assignment
  await knex.raw(`
    CREATE POLICY tenant_tier_insert ON tenant_tiers
      FOR INSERT TO app_user
      WITH CHECK (
        tenant_id = app_current_tenant_id()
        AND is_current_tenant_admin()
      )
  `);

  await knex.raw(`
    CREATE POLICY tenant_tier_update ON tenant_tiers
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
  await knex.raw('DROP POLICY IF EXISTS tenant_tier_update ON tenant_tiers');
  await knex.raw('DROP POLICY IF EXISTS tenant_tier_insert ON tenant_tiers');
}
