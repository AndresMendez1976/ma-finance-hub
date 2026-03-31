// Migration: Create purchase_orders, po_lines, receipts, receipt_lines for procurement
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── purchase_orders ──
  await knex.schema.createTable('purchase_orders', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('po_number', 50).notNullable();
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.string('vendor_name', 255).notNullable();
    t.date('order_date').notNullable();
    t.date('expected_delivery_date').nullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
    t.decimal('tax_rate', 5, 2).notNullable().defaultTo(0);
    t.decimal('tax_amount', 12, 2).notNullable().defaultTo(0);
    t.decimal('shipping_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('total', 12, 2).notNullable().defaultTo(0);
    t.text('notes').nullable();
    t.text('shipping_address').nullable();
    t.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.date('approved_date').nullable();
    t.bigInteger('created_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE purchase_orders ADD CONSTRAINT po_status_check CHECK (status IN ('draft','sent','partial','received','cancelled'))`);
  await knex.raw(`CREATE UNIQUE INDEX po_tenant_number_uniq ON purchase_orders (tenant_id, po_number)`);
  await knex.raw(`CREATE INDEX po_tenant_status_idx ON purchase_orders (tenant_id, status)`);
  await knex.raw(`ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY po_tenant_sel ON purchase_orders FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY po_tenant_ins ON purchase_orders FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY po_tenant_upd ON purchase_orders FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY po_tenant_del ON purchase_orders FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY po_migration ON purchase_orders FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_orders TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE purchase_orders_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_po BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── purchase_order_lines ──
  await knex.schema.createTable('purchase_order_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('purchase_order_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 500).notNullable();
    t.decimal('quantity_ordered', 10, 2).notNullable();
    t.decimal('quantity_received', 10, 2).notNullable().defaultTo(0);
    t.decimal('unit_price', 12, 2).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.bigInteger('account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pol_tenant_sel ON purchase_order_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pol_tenant_ins ON purchase_order_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pol_tenant_upd ON purchase_order_lines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pol_tenant_del ON purchase_order_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pol_migration ON purchase_order_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_order_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE purchase_order_lines_id_seq TO app_user`);

  // ── purchase_order_receipts ──
  await knex.schema.createTable('purchase_order_receipts', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('purchase_order_id').notNullable().references('id').inTable('purchase_orders').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.date('receipt_date').notNullable();
    t.bigInteger('received_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.text('notes').nullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE purchase_order_receipts ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY por_tenant_sel ON purchase_order_receipts FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY por_tenant_ins ON purchase_order_receipts FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY por_migration ON purchase_order_receipts FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT ON purchase_order_receipts TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE purchase_order_receipts_id_seq TO app_user`);

  // ── purchase_order_receipt_lines ──
  await knex.schema.createTable('purchase_order_receipt_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('receipt_id').notNullable().references('id').inTable('purchase_order_receipts').onDelete('CASCADE');
    t.bigInteger('po_line_id').notNullable().references('id').inTable('purchase_order_lines').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.decimal('quantity_received', 10, 2).notNullable();
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE purchase_order_receipt_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY porl_tenant_sel ON purchase_order_receipt_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY porl_tenant_ins ON purchase_order_receipt_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY porl_migration ON purchase_order_receipt_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT ON purchase_order_receipt_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE purchase_order_receipt_lines_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('purchase_order_receipt_lines');
  await knex.schema.dropTableIfExists('purchase_order_receipts');
  await knex.schema.dropTableIfExists('purchase_order_lines');
  await knex.schema.dropTableIfExists('purchase_orders');
}
