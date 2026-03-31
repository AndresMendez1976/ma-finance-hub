// Migration: Create custom_field_definitions and custom_field_values for user-defined fields
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── custom_field_definitions ──
  await knex.schema.createTable('custom_field_definitions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('entity_type', 50).notNullable();
    t.string('field_name', 100).notNullable();
    t.string('field_label', 255).notNullable();
    t.string('field_type', 20).notNullable().defaultTo('text');
    t.jsonb('select_options').nullable();
    t.boolean('is_required').notNullable().defaultTo(false);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE custom_field_definitions ADD CONSTRAINT cfd_entity_check CHECK (entity_type IN ('contacts','invoices','expenses','products','purchase_orders','projects','employees','fixed_assets'))`);
  await knex.raw(`ALTER TABLE custom_field_definitions ADD CONSTRAINT cfd_type_check CHECK (field_type IN ('text','number','date','boolean','select'))`);
  await knex.raw(`ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cfd_sel ON custom_field_definitions FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfd_ins ON custom_field_definitions FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfd_upd ON custom_field_definitions FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfd_del ON custom_field_definitions FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfd_mig ON custom_field_definitions FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_definitions TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE custom_field_definitions_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_cfd BEFORE UPDATE ON custom_field_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── custom_field_values ──
  await knex.schema.createTable('custom_field_values', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('definition_id').notNullable().references('id').inTable('custom_field_definitions').onDelete('CASCADE');
    t.string('entity_type', 50).notNullable();
    t.bigInteger('entity_id').notNullable();
    t.text('value_text').nullable();
    t.decimal('value_number', 18, 4).nullable();
    t.date('value_date').nullable();
    t.boolean('value_boolean').nullable();
    t.timestamps(true, true);
  });
  await knex.raw(`CREATE UNIQUE INDEX cfv_entity_def_uniq ON custom_field_values (tenant_id, definition_id, entity_type, entity_id)`);
  await knex.raw(`CREATE INDEX cfv_entity_idx ON custom_field_values (tenant_id, entity_type, entity_id)`);
  await knex.raw(`ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cfv_sel ON custom_field_values FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfv_ins ON custom_field_values FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfv_upd ON custom_field_values FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfv_del ON custom_field_values FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cfv_mig ON custom_field_values FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_values TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE custom_field_values_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_cfv BEFORE UPDATE ON custom_field_values FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_field_values');
  await knex.schema.dropTableIfExists('custom_field_definitions');
}
