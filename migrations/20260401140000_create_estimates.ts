// Migration: Create estimates and estimate_lines for quotes/proposals
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── estimates ──
  await knex.schema.createTable('estimates', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('estimate_number', 50).notNullable();
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.string('customer_name', 255).notNullable();
    t.string('customer_email', 255).nullable();
    t.date('issue_date').notNullable();
    t.date('expiration_date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.text('notes').nullable();
    t.bigInteger('converted_invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE estimates ADD CONSTRAINT est_status_check CHECK (status IN ('draft','sent','accepted','rejected','expired','converted'))`);
  await knex.raw(`CREATE UNIQUE INDEX est_tenant_number_uniq ON estimates (tenant_id, estimate_number)`);
  await knex.raw(`ALTER TABLE estimates ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY est_sel ON estimates FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY est_ins ON estimates FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY est_upd ON estimates FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY est_del ON estimates FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY est_mig ON estimates FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON estimates TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE estimates_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_est BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── estimate_lines ──
  await knex.schema.createTable('estimate_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('estimate_id').notNullable().references('id').inTable('estimates').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('quantity', 10, 2).notNullable();
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
  });
  await knex.raw(`ALTER TABLE estimate_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY el_sel ON estimate_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY el_ins ON estimate_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY el_del ON estimate_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY el_mig ON estimate_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, DELETE ON estimate_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE estimate_lines_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('estimate_lines');
  await knex.schema.dropTableIfExists('estimates');
}
