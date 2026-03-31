// Migration: Create invoices and invoice_lines tables for the Invoicing module.
// Invoices support draft → sent → paid/overdue/voided lifecycle.
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── invoices table ──
  await knex.schema.createTable('invoices', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('invoice_number', 50).notNullable();
    t.string('customer_name', 255).notNullable();
    t.string('customer_email', 255).nullable();
    t.text('customer_address').nullable();
    t.date('issue_date').notNullable();
    t.date('due_date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.text('notes').nullable();
    t.date('paid_date').nullable();
    t.decimal('paid_amount', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
  });

  // Status check constraint
  await knex.raw(`
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'voided'))
  `);

  // Unique invoice number per tenant
  await knex.raw(`CREATE UNIQUE INDEX invoices_tenant_number_uniq ON invoices (tenant_id, invoice_number)`);
  await knex.raw(`CREATE INDEX invoices_tenant_status_idx ON invoices (tenant_id, status)`);
  await knex.raw(`CREATE INDEX invoices_tenant_due_date_idx ON invoices (tenant_id, due_date)`);

  // ── invoice_lines table ──
  await knex.schema.createTable('invoice_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('invoice_id').notNullable().references('id').inTable('invoices').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('quantity', 10, 2).notNullable().defaultTo(1);
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.raw(`CREATE INDEX invoice_lines_invoice_idx ON invoice_lines (invoice_id)`);
  await knex.raw(`CREATE INDEX invoice_lines_tenant_idx ON invoice_lines (tenant_id)`);

  // ── RLS policies ──
  await knex.raw(`ALTER TABLE invoices ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY`);

  // App user policies (tenant isolation)
  await knex.raw(`
    CREATE POLICY invoices_tenant_select ON invoices FOR SELECT TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY invoices_tenant_insert ON invoices FOR INSERT TO app_user
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY invoices_tenant_update ON invoices FOR UPDATE TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY invoices_tenant_delete ON invoices FOR DELETE TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);

  await knex.raw(`
    CREATE POLICY invoice_lines_tenant_select ON invoice_lines FOR SELECT TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY invoice_lines_tenant_insert ON invoice_lines FOR INSERT TO app_user
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY invoice_lines_tenant_update ON invoice_lines FOR UPDATE TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY invoice_lines_tenant_delete ON invoice_lines FOR DELETE TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);

  // Migration user bypass policies
  await knex.raw(`CREATE POLICY invoices_migration_all ON invoices FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`CREATE POLICY invoice_lines_migration_all ON invoice_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  // Default privileges for app_user on both tables
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO app_user`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE invoice_lines_id_seq TO app_user`);

  // Updated_at trigger
  await knex.raw(`CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
  await knex.raw(`CREATE TRIGGER set_updated_at_invoice_lines BEFORE UPDATE ON invoice_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invoice_lines');
  await knex.schema.dropTableIfExists('invoices');
}
