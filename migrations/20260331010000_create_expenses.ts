// Migration: Create expenses table for expense tracking module.
// Supports pending → approved → posted → voided lifecycle with journal entry linkage.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('expenses', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('expense_number', 50).notNullable();
    t.date('date').notNullable();
    t.string('vendor_name', 255).notNullable();
    t.string('category', 100).notNullable();
    t.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.bigInteger('payment_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.decimal('amount', 12, 2).notNullable();
    t.text('description').nullable();
    t.string('reference', 100).nullable();
    t.string('status', 20).notNullable().defaultTo('pending');
    t.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.string('receipt_url', 500).nullable();
    t.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
  });

  await knex.raw(`ALTER TABLE expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('pending','approved','posted','voided'))`);
  await knex.raw(`CREATE UNIQUE INDEX expenses_tenant_number_uniq ON expenses (tenant_id, expense_number)`);
  await knex.raw(`CREATE INDEX expenses_tenant_status_idx ON expenses (tenant_id, status)`);
  await knex.raw(`CREATE INDEX expenses_tenant_date_idx ON expenses (tenant_id, date)`);
  await knex.raw(`CREATE INDEX expenses_tenant_category_idx ON expenses (tenant_id, category)`);

  // RLS
  await knex.raw(`ALTER TABLE expenses ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY expenses_tenant_select ON expenses FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY expenses_tenant_insert ON expenses FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY expenses_tenant_update ON expenses FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY expenses_tenant_delete ON expenses FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY expenses_migration_all ON expenses FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE expenses_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expenses');
}
