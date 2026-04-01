// Migration: Create credit_notes and credit_note_lines tables
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── credit_notes ──
  await knex.schema.createTable('credit_notes', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('credit_note_number', 50).notNullable();
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.bigInteger('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.string('reason', 500).notNullable();
    t.date('date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.text('notes').nullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.bigInteger('applied_to_invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE credit_notes ADD CONSTRAINT cn_status_check CHECK (status IN ('draft','issued','applied','voided'))`);
  await knex.raw(`CREATE UNIQUE INDEX cn_tenant_number_uniq ON credit_notes (tenant_id, credit_note_number)`);
  await knex.raw(`ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cn_sel ON credit_notes FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cn_ins ON credit_notes FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cn_upd ON credit_notes FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cn_del ON credit_notes FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cn_mig ON credit_notes FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON credit_notes TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE credit_notes_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_cn BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── credit_note_lines ──
  await knex.schema.createTable('credit_note_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('credit_note_id').notNullable().references('id').inTable('credit_notes').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('quantity', 10, 2).notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
  });
  await knex.raw(`ALTER TABLE credit_note_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cnl_sel ON credit_note_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cnl_ins ON credit_note_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cnl_upd ON credit_note_lines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cnl_del ON credit_note_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cnl_mig ON credit_note_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON credit_note_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE credit_note_lines_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credit_note_lines');
  await knex.schema.dropTableIfExists('credit_notes');
}
