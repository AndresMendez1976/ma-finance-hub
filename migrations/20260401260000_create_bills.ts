// Migration: Create bills, bill_lines, bill_payments for accounts payable
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── bills ──
  await knex.schema.createTable('bills', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('bill_number', 50).notNullable();
    t.string('vendor_bill_number', 100).nullable();
    t.bigInteger('contact_id').notNullable().references('id').inTable('contacts').onDelete('RESTRICT');
    t.date('date').notNullable();
    t.date('due_date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.decimal('amount_paid', 12, 2).notNullable().defaultTo(0);
    t.decimal('balance_due', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('purchase_order_id').nullable().references('id').inTable('purchase_orders').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.bigInteger('payment_journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE bills ADD CONSTRAINT bill_status_check CHECK (status IN ('draft','received','approved','paid','partial','overdue','voided'))`);
  await knex.raw(`CREATE UNIQUE INDEX bill_tenant_number_uniq ON bills (tenant_id, bill_number)`);
  await knex.raw(`ALTER TABLE bills ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bill_sel ON bills FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bill_ins ON bills FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bill_upd ON bills FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bill_del ON bills FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bill_mig ON bills FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bills TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bills_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_bill BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── bill_lines ──
  await knex.schema.createTable('bill_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('bill_id').notNullable().references('id').inTable('bills').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('quantity', 10, 2).notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.integer('sort_order').notNullable().defaultTo(0);
  });
  await knex.raw(`ALTER TABLE bill_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bl_sel ON bill_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_ins ON bill_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_upd ON bill_lines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_del ON bill_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_mig ON bill_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bill_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bill_lines_id_seq TO app_user`);

  // ── bill_payments ──
  await knex.schema.createTable('bill_payments', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('bill_id').notNullable().references('id').inTable('bills').onDelete('RESTRICT');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.date('payment_date').notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('payment_method', 30).notNullable();
    t.string('reference', 100).nullable();
    t.bigInteger('bank_account_id').nullable().references('id').inTable('bank_accounts').onDelete('SET NULL');
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bp_sel ON bill_payments FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bp_ins ON bill_payments FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bp_upd ON bill_payments FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bp_del ON bill_payments FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bp_mig ON bill_payments FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bill_payments TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bill_payments_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bill_payments');
  await knex.schema.dropTableIfExists('bill_lines');
  await knex.schema.dropTableIfExists('bills');
}
