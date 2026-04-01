// Migration: Create job costing tables — cost_codes, job_cost_entries, unit_price_items, change_orders, progress_billings
// Also adds construction/job costing columns to projects.
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── cost_codes ──
  await knex.schema.createTable('cost_codes', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('code', 50).notNullable();
    t.string('name', 255).notNullable();
    t.string('category', 30).notNullable();
    t.string('unit_of_measure', 50).nullable();
    t.decimal('default_unit_cost', 12, 2).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.bigInteger('parent_id').nullable().references('id').inTable('cost_codes').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE cost_codes ADD CONSTRAINT cc_category_check CHECK (category IN ('labor','material','equipment','subcontractor','overhead','other'))`);
  await knex.raw(`ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cc_sel ON cost_codes FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cc_ins ON cost_codes FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cc_upd ON cost_codes FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cc_del ON cost_codes FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cc_mig ON cost_codes FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON cost_codes TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE cost_codes_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_cc BEFORE UPDATE ON cost_codes FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── job_cost_entries ──
  await knex.schema.createTable('job_cost_entries', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('project_id').notNullable().references('id').inTable('projects').onDelete('RESTRICT');
    t.bigInteger('cost_code_id').notNullable().references('id').inTable('cost_codes').onDelete('RESTRICT');
    t.date('date').notNullable();
    t.string('description', 500).notNullable();
    t.string('source_type', 30).notNullable();
    t.bigInteger('source_id').nullable();
    t.decimal('quantity', 10, 4).notNullable();
    t.decimal('unit_cost', 12, 4).notNullable();
    t.decimal('total_cost', 12, 2).notNullable();
    t.boolean('is_billable').notNullable().defaultTo(false);
    t.boolean('billed').notNullable().defaultTo(false);
    t.bigInteger('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE job_cost_entries ADD CONSTRAINT jce_source_check CHECK (source_type IN ('manual','timesheet','expense','bill','po_receipt'))`);
  await knex.raw(`ALTER TABLE job_cost_entries ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY jce_sel ON job_cost_entries FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY jce_ins ON job_cost_entries FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY jce_upd ON job_cost_entries FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY jce_del ON job_cost_entries FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY jce_mig ON job_cost_entries FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON job_cost_entries TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE job_cost_entries_id_seq TO app_user`);

  // ── ALTER projects: add job costing columns ──
  await knex.schema.alterTable('projects', (t) => {
    t.jsonb('budget_by_cost_code').nullable();
    t.decimal('contract_amount', 12, 2).nullable();
    t.string('contract_type', 30).nullable();
    t.decimal('percent_complete', 5, 2).notNullable().defaultTo(0);
    t.decimal('earned_value', 12, 2).notNullable().defaultTo(0);
  });

  // ── unit_price_items ──
  await knex.schema.createTable('unit_price_items', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('project_id').notNullable().references('id').inTable('projects').onDelete('RESTRICT');
    t.bigInteger('cost_code_id').notNullable().references('id').inTable('cost_codes').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('contract_quantity', 12, 4).notNullable();
    t.decimal('contract_unit_price', 12, 4).notNullable();
    t.decimal('contract_total', 12, 2).notNullable().defaultTo(0);
    t.decimal('quantity_completed', 12, 4).notNullable().defaultTo(0);
    t.decimal('quantity_this_period', 12, 4).notNullable().defaultTo(0);
    t.decimal('amount_earned', 12, 2).notNullable().defaultTo(0);
    t.decimal('amount_billed', 12, 2).notNullable().defaultTo(0);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE unit_price_items ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY upi_sel ON unit_price_items FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY upi_ins ON unit_price_items FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY upi_upd ON unit_price_items FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY upi_del ON unit_price_items FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY upi_mig ON unit_price_items FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON unit_price_items TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE unit_price_items_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_upi BEFORE UPDATE ON unit_price_items FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── change_orders ──
  await knex.schema.createTable('change_orders', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('project_id').notNullable().references('id').inTable('projects').onDelete('RESTRICT');
    t.string('co_number', 50).notNullable();
    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.string('status', 20).notNullable().defaultTo('pending');
    t.decimal('amount', 12, 2).notNullable();
    t.jsonb('cost_impact').nullable();
    t.date('submitted_date').notNullable();
    t.date('approved_date').nullable();
    t.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE change_orders ADD CONSTRAINT co_status_check CHECK (status IN ('pending','approved','rejected'))`);
  await knex.raw(`CREATE UNIQUE INDEX co_tenant_number_uniq ON change_orders (tenant_id, co_number)`);
  await knex.raw(`ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY co_sel ON change_orders FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_ins ON change_orders FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_upd ON change_orders FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_del ON change_orders FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_mig ON change_orders FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON change_orders TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE change_orders_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_co BEFORE UPDATE ON change_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── progress_billings ──
  await knex.schema.createTable('progress_billings', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('project_id').notNullable().references('id').inTable('projects').onDelete('RESTRICT');
    t.string('billing_number', 50).notNullable();
    t.date('billing_period_start').notNullable();
    t.date('billing_period_end').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('total_earned_this_period', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_retainage', 12, 2).notNullable().defaultTo(0);
    t.decimal('net_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('previous_billings', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_to_date', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE progress_billings ADD CONSTRAINT pb_status_check CHECK (status IN ('draft','submitted','approved','invoiced'))`);
  await knex.raw(`CREATE UNIQUE INDEX pb_tenant_number_uniq ON progress_billings (tenant_id, billing_number)`);
  await knex.raw(`ALTER TABLE progress_billings ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pb_sel ON progress_billings FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pb_ins ON progress_billings FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pb_upd ON progress_billings FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pb_del ON progress_billings FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pb_mig ON progress_billings FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON progress_billings TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE progress_billings_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_pb BEFORE UPDATE ON progress_billings FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── progress_billing_lines ──
  await knex.schema.createTable('progress_billing_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('billing_id').notNullable().references('id').inTable('progress_billings').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('cost_code_id').nullable().references('id').inTable('cost_codes').onDelete('SET NULL');
    t.bigInteger('unit_price_item_id').nullable().references('id').inTable('unit_price_items').onDelete('SET NULL');
    t.string('description', 500).notNullable();
    t.decimal('scheduled_value', 12, 2).notNullable().defaultTo(0);
    t.decimal('previous_completed', 12, 2).notNullable().defaultTo(0);
    t.decimal('this_period', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_completed', 12, 2).notNullable().defaultTo(0);
    t.decimal('retainage', 12, 2).notNullable().defaultTo(0);
    t.decimal('percent_complete', 5, 2).notNullable().defaultTo(0);
  });
  await knex.raw(`ALTER TABLE progress_billing_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pbl_sel ON progress_billing_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pbl_ins ON progress_billing_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pbl_upd ON progress_billing_lines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pbl_del ON progress_billing_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pbl_mig ON progress_billing_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON progress_billing_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE progress_billing_lines_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('progress_billing_lines');
  await knex.schema.dropTableIfExists('progress_billings');
  await knex.schema.dropTableIfExists('change_orders');
  await knex.schema.dropTableIfExists('unit_price_items');
  await knex.schema.alterTable('projects', (t) => {
    t.dropColumn('budget_by_cost_code');
    t.dropColumn('contract_amount');
    t.dropColumn('contract_type');
    t.dropColumn('percent_complete');
    t.dropColumn('earned_value');
  });
  await knex.schema.dropTableIfExists('job_cost_entries');
  await knex.schema.dropTableIfExists('cost_codes');
}
