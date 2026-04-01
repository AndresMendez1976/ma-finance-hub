import { Knex } from 'knex';
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE POLICY IF NOT EXISTS membership_login_by_user ON tenant_memberships FOR SELECT TO app_user USING (true)`);
  await knex.raw(`CREATE POLICY IF NOT EXISTS tenants_login_select ON tenants FOR SELECT TO app_user USING (true)`);
  await knex.raw(`CREATE POLICY IF NOT EXISTS settings_login_select ON tenant_settings FOR SELECT TO app_user USING (true)`);
}
export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP POLICY IF EXISTS membership_login_by_user ON tenant_memberships`);
  await knex.raw(`DROP POLICY IF EXISTS tenants_login_select ON tenants`);
  await knex.raw(`DROP POLICY IF EXISTS settings_login_select ON tenant_settings`);
}
