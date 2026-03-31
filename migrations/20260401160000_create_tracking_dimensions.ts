// Migration: Create tracking_dimensions and tracking_values for class/location/department tracking
// Also add dimension columns to journal_lines, invoices, and expenses
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── tracking_dimensions ──
  await knex.schema.createTable('tracking_dimensions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE tracking_dimensions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY td_sel ON tracking_dimensions FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY td_ins ON tracking_dimensions FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY td_upd ON tracking_dimensions FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY td_del ON tracking_dimensions FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY td_mig ON tracking_dimensions FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON tracking_dimensions TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE tracking_dimensions_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_td BEFORE UPDATE ON tracking_dimensions FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── tracking_values ──
  await knex.schema.createTable('tracking_values', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('dimension_id').notNullable().references('id').inTable('tracking_dimensions').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('value', 255).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE tracking_values ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY tv_sel ON tracking_values FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tv_ins ON tracking_values FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tv_upd ON tracking_values FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tv_del ON tracking_values FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tv_mig ON tracking_values FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON tracking_values TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE tracking_values_id_seq TO app_user`);

  // Add dimension columns to journal_lines
  await knex.schema.alterTable('journal_lines', (t) => {
    t.bigInteger('dimension_1_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
    t.bigInteger('dimension_2_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
    t.bigInteger('dimension_3_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
  });

  // Add dimension columns to invoices
  await knex.schema.alterTable('invoices', (t) => {
    t.bigInteger('dimension_1_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
    t.bigInteger('dimension_2_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
    t.bigInteger('dimension_3_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
  });

  // Add dimension columns to expenses
  await knex.schema.alterTable('expenses', (t) => {
    t.bigInteger('dimension_1_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
    t.bigInteger('dimension_2_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
    t.bigInteger('dimension_3_id').nullable().references('id').inTable('tracking_values').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('expenses', (t) => {
    t.dropColumn('dimension_1_id');
    t.dropColumn('dimension_2_id');
    t.dropColumn('dimension_3_id');
  });
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('dimension_1_id');
    t.dropColumn('dimension_2_id');
    t.dropColumn('dimension_3_id');
  });
  await knex.schema.alterTable('journal_lines', (t) => {
    t.dropColumn('dimension_1_id');
    t.dropColumn('dimension_2_id');
    t.dropColumn('dimension_3_id');
  });
  await knex.schema.dropTableIfExists('tracking_values');
  await knex.schema.dropTableIfExists('tracking_dimensions');
}
