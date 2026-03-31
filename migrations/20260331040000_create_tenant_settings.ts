// Migration: Create tenant_settings — company profile and numbering config
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tenant_settings', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().unique().references('id').inTable('tenants').onDelete('CASCADE');
    t.string('company_name', 255).nullable();
    t.string('company_email', 255).nullable();
    t.string('company_phone', 50).nullable();
    t.string('company_address_line1', 255).nullable();
    t.string('company_address_line2', 255).nullable();
    t.string('company_city', 100).nullable();
    t.string('company_state', 50).nullable();
    t.string('company_zip', 20).nullable();
    t.string('company_country', 10).notNullable().defaultTo('US');
    t.string('tax_id', 50).nullable();
    t.integer('fiscal_year_start_month').notNullable().defaultTo(1);
    t.string('default_currency', 10).notNullable().defaultTo('USD');
    t.string('invoice_prefix', 20).notNullable().defaultTo('INV');
    t.integer('invoice_next_number').notNullable().defaultTo(1);
    t.string('expense_prefix', 20).notNullable().defaultTo('EXP');
    t.integer('expense_next_number').notNullable().defaultTo(1);
    t.string('logo_url', 500).nullable();
    t.timestamps(true, true);
  });

  await knex.raw(`ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY tenant_settings_tenant_select ON tenant_settings FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tenant_settings_tenant_insert ON tenant_settings FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tenant_settings_tenant_update ON tenant_settings FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tenant_settings_migration_all ON tenant_settings FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE ON tenant_settings TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE tenant_settings_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_tenant_settings BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenant_settings');
}
