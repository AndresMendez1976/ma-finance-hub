// Migration: Create recurring_invoices and recurring_invoice_lines for auto-invoice generation
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── recurring_invoices ──
  await knex.schema.createTable('recurring_invoices', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.string('template_name', 255).notNullable();
    t.string('customer_name', 255).notNullable();
    t.string('frequency', 20).notNullable().defaultTo('monthly');
    t.date('next_run_date').notNullable();
    t.date('end_date').nullable();
    t.string('status', 20).notNullable().defaultTo('active');
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.text('notes').nullable();
    t.boolean('auto_send').notNullable().defaultTo(false);
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE recurring_invoices ADD CONSTRAINT ri_freq_check CHECK (frequency IN ('weekly','biweekly','monthly','quarterly','annually'))`);
  await knex.raw(`ALTER TABLE recurring_invoices ADD CONSTRAINT ri_status_check CHECK (status IN ('active','paused','ended'))`);
  await knex.raw(`ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY ri_sel ON recurring_invoices FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ri_ins ON recurring_invoices FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ri_upd ON recurring_invoices FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ri_del ON recurring_invoices FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ri_mig ON recurring_invoices FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_invoices TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE recurring_invoices_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_ri BEFORE UPDATE ON recurring_invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── recurring_invoice_lines ──
  await knex.schema.createTable('recurring_invoice_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('recurring_invoice_id').notNullable().references('id').inTable('recurring_invoices').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('quantity', 10, 2).notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
  });
  await knex.raw(`ALTER TABLE recurring_invoice_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY ril_sel ON recurring_invoice_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ril_ins ON recurring_invoice_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ril_del ON recurring_invoice_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ril_mig ON recurring_invoice_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, DELETE ON recurring_invoice_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE recurring_invoice_lines_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recurring_invoice_lines');
  await knex.schema.dropTableIfExists('recurring_invoices');
}
