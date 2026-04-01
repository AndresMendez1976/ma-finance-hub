// Migration: Create equipment and equipment_usage tables for equipment tracking
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── equipment ──
  await knex.schema.createTable('equipment', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('equipment_number', 50).notNullable();
    t.string('name', 255).notNullable();
    t.string('category', 100).notNullable();
    t.string('make', 100).nullable();
    t.string('model', 100).nullable();
    t.string('serial_number', 100).nullable();
    t.integer('year').nullable();
    t.string('status', 20).notNullable().defaultTo('available');
    t.date('purchase_date').nullable();
    t.decimal('purchase_price', 12, 2).nullable();
    t.decimal('current_value', 12, 2).nullable();
    t.decimal('hourly_rate', 12, 2).nullable();
    t.decimal('daily_rate', 12, 2).nullable();
    t.string('location', 255).nullable();
    t.bigInteger('assigned_project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    t.bigInteger('fixed_asset_id').nullable().references('id').inTable('fixed_assets').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE equipment ADD CONSTRAINT eq_status_check CHECK (status IN ('available','in_use','maintenance','retired'))`);
  await knex.raw(`CREATE UNIQUE INDEX eq_tenant_number_uniq ON equipment (tenant_id, equipment_number)`);
  await knex.raw(`ALTER TABLE equipment ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY eq_sel ON equipment FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eq_ins ON equipment FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eq_upd ON equipment FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eq_del ON equipment FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eq_mig ON equipment FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON equipment TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE equipment_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_eq BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── equipment_usage ──
  await knex.schema.createTable('equipment_usage', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('equipment_id').notNullable().references('id').inTable('equipment').onDelete('RESTRICT');
    t.bigInteger('project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    t.date('date').notNullable();
    t.decimal('hours_used', 10, 2).notNullable();
    t.decimal('hourly_rate', 12, 2).notNullable();
    t.decimal('total_cost', 12, 2).notNullable();
    t.decimal('fuel_gallons', 10, 2).nullable();
    t.decimal('fuel_cost', 10, 2).nullable();
    t.bigInteger('operator_employee_id').nullable().references('id').inTable('employees').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('job_cost_entry_id').nullable().references('id').inTable('job_cost_entries').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE equipment_usage ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY eu_sel ON equipment_usage FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eu_ins ON equipment_usage FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eu_upd ON equipment_usage FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eu_del ON equipment_usage FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eu_mig ON equipment_usage FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_usage TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE equipment_usage_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('equipment_usage');
  await knex.schema.dropTableIfExists('equipment');
}
