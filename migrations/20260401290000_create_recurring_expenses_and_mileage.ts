// Migration: Create recurring_expenses and mileage_entries tables
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── recurring_expenses ──
  await knex.schema.createTable('recurring_expenses', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.string('description', 255).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.string('category', 100).notNullable();
    t.string('frequency', 20).notNullable();
    t.date('next_run_date').notNullable();
    t.date('end_date').nullable();
    t.string('status', 20).notNullable().defaultTo('active');
    t.boolean('auto_approve').notNullable().defaultTo(false);
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE recurring_expenses ADD CONSTRAINT re_freq_check CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','annually'))`);
  await knex.raw(`ALTER TABLE recurring_expenses ADD CONSTRAINT re_status_check CHECK (status IN ('active','paused','ended'))`);
  await knex.raw(`ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY re_sel ON recurring_expenses FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY re_ins ON recurring_expenses FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY re_upd ON recurring_expenses FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY re_del ON recurring_expenses FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY re_mig ON recurring_expenses FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_expenses TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE recurring_expenses_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_re BEFORE UPDATE ON recurring_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── mileage_entries ──
  await knex.schema.createTable('mileage_entries', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.date('date').notNullable();
    t.string('description', 500).notNullable();
    t.decimal('distance_miles', 10, 2).notNullable();
    t.decimal('rate_per_mile', 8, 4).notNullable().defaultTo(0.70);
    t.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.string('vehicle', 100).nullable();
    t.boolean('is_round_trip').notNullable().defaultTo(false);
    t.boolean('is_billable').notNullable().defaultTo(false);
    t.bigInteger('expense_id').nullable().references('id').inTable('expenses').onDelete('SET NULL');
    t.string('status', 20).notNullable().defaultTo('draft');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE mileage_entries ADD CONSTRAINT me_status_check CHECK (status IN ('draft','approved','expensed'))`);
  await knex.raw(`ALTER TABLE mileage_entries ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY me_sel ON mileage_entries FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY me_ins ON mileage_entries FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY me_upd ON mileage_entries FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY me_del ON mileage_entries FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY me_mig ON mileage_entries FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON mileage_entries TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE mileage_entries_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_me BEFORE UPDATE ON mileage_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mileage_entries');
  await knex.schema.dropTableIfExists('recurring_expenses');
}
