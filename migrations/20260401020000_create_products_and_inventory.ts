// Migration: Create products, inventory locations, lots, transactions, adjustments, transfers
// Supports FIFO/LIFO/Average Cost, multi-location, lot tracking, serial numbers
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── products ──
  await knex.schema.createTable('products', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('sku', 100).notNullable();
    t.string('name', 255).notNullable();
    t.text('description').nullable();
    t.string('category', 100).nullable();
    t.string('type', 20).notNullable().defaultTo('inventory'); // inventory, non_inventory, service
    t.string('costing_method', 20).nullable(); // fifo, lifo, average_cost — only for inventory type
    t.string('unit_of_measure', 50).notNullable().defaultTo('unit');
    t.decimal('sale_price', 12, 2).nullable();
    t.decimal('purchase_price', 12, 2).nullable();
    t.bigInteger('revenue_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.bigInteger('cogs_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.bigInteger('inventory_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.bigInteger('expense_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.decimal('reorder_point', 10, 2).nullable();
    t.decimal('reorder_quantity', 10, 2).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.boolean('track_lots').notNullable().defaultTo(false);
    t.boolean('track_serials').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE products ADD CONSTRAINT products_type_check CHECK (type IN ('inventory','non_inventory','service'))`);
  await knex.raw(`ALTER TABLE products ADD CONSTRAINT products_costing_check CHECK (costing_method IS NULL OR costing_method IN ('fifo','lifo','average_cost'))`);
  await knex.raw(`CREATE UNIQUE INDEX products_tenant_sku_uniq ON products (tenant_id, sku)`);
  await knex.raw(`ALTER TABLE products ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY products_sel ON products FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY products_ins ON products FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY products_upd ON products FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY products_del ON products FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY products_mig ON products FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON products TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── inventory_locations ──
  await knex.schema.createTable('inventory_locations', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.text('address').nullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_loc_sel ON inventory_locations FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_loc_ins ON inventory_locations FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_loc_upd ON inventory_locations FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_loc_del ON inventory_locations FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_loc_mig ON inventory_locations FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_locations TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_locations_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_inv_loc BEFORE UPDATE ON inventory_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── inventory_lots ──
  await knex.schema.createTable('inventory_lots', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.string('lot_number', 100).notNullable();
    t.date('expiration_date').nullable();
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_lots_sel ON inventory_lots FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_lots_ins ON inventory_lots FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_lots_upd ON inventory_lots FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_lots_del ON inventory_lots FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_lots_mig ON inventory_lots FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_lots TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_lots_id_seq TO app_user`);

  // ── inventory_transactions — IMMUTABLE ──
  await knex.schema.createTable('inventory_transactions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.bigInteger('location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    t.bigInteger('lot_id').nullable().references('id').inTable('inventory_lots').onDelete('SET NULL');
    t.string('serial_number', 100).nullable();
    t.string('transaction_type', 30).notNullable();
    t.decimal('quantity', 10, 2).notNullable(); // +in, -out
    t.decimal('unit_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_cost', 12, 2).notNullable().defaultTo(0);
    t.string('reference_type', 50).nullable();
    t.bigInteger('reference_id').nullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.date('date').notNullable();
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE inventory_transactions ADD CONSTRAINT inv_txn_type_check CHECK (transaction_type IN ('purchase_receipt','sale','adjustment_in','adjustment_out','transfer_in','transfer_out','assembly_in','assembly_out','return_in','return_out'))`);
  await knex.raw(`CREATE INDEX inv_txn_tenant_product_idx ON inventory_transactions (tenant_id, product_id)`);
  await knex.raw(`CREATE INDEX inv_txn_tenant_date_idx ON inventory_transactions (tenant_id, date)`);
  await knex.raw(`ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_txn_sel ON inventory_transactions FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_txn_ins ON inventory_transactions FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_txn_mig ON inventory_transactions FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT ON inventory_transactions TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_transactions_id_seq TO app_user`);
  // Prevent updates/deletes on inventory_transactions (immutable)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_inv_txn_mutation() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'inventory_transactions is append-only'; END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`CREATE TRIGGER no_update_inv_txn BEFORE UPDATE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION prevent_inv_txn_mutation()`);
  await knex.raw(`CREATE TRIGGER no_delete_inv_txn BEFORE DELETE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION prevent_inv_txn_mutation()`);

  // ── inventory_adjustments ──
  await knex.schema.createTable('inventory_adjustments', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('adjustment_number', 50).notNullable();
    t.date('date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.text('reason').nullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE inventory_adjustments ADD CONSTRAINT inv_adj_status_check CHECK (status IN ('draft','posted'))`);
  await knex.raw(`CREATE UNIQUE INDEX inv_adj_tenant_num_uniq ON inventory_adjustments (tenant_id, adjustment_number)`);
  await knex.raw(`ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_adj_sel ON inventory_adjustments FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_adj_ins ON inventory_adjustments FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_adj_upd ON inventory_adjustments FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_adj_mig ON inventory_adjustments FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE ON inventory_adjustments TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_adjustments_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_inv_adj BEFORE UPDATE ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── inventory_adjustment_lines ──
  await knex.schema.createTable('inventory_adjustment_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('adjustment_id').notNullable().references('id').inTable('inventory_adjustments').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.bigInteger('location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    t.bigInteger('lot_id').nullable().references('id').inTable('inventory_lots').onDelete('SET NULL');
    t.decimal('qty_on_hand', 10, 2).notNullable().defaultTo(0);
    t.decimal('qty_counted', 10, 2).notNullable().defaultTo(0);
    t.decimal('difference', 10, 2).notNullable().defaultTo(0);
    t.decimal('unit_cost', 12, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE inventory_adjustment_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_adjl_sel ON inventory_adjustment_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_adjl_ins ON inventory_adjustment_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_adjl_del ON inventory_adjustment_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_adjl_mig ON inventory_adjustment_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, DELETE ON inventory_adjustment_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_adjustment_lines_id_seq TO app_user`);

  // ── inventory_transfers ──
  await knex.schema.createTable('inventory_transfers', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('transfer_number', 50).notNullable();
    t.bigInteger('from_location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    t.bigInteger('to_location_id').notNullable().references('id').inTable('inventory_locations').onDelete('RESTRICT');
    t.date('date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE inventory_transfers ADD CONSTRAINT inv_trf_status_check CHECK (status IN ('draft','completed'))`);
  await knex.raw(`CREATE UNIQUE INDEX inv_trf_tenant_num_uniq ON inventory_transfers (tenant_id, transfer_number)`);
  await knex.raw(`ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_trf_sel ON inventory_transfers FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_trf_ins ON inventory_transfers FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_trf_upd ON inventory_transfers FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_trf_mig ON inventory_transfers FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE ON inventory_transfers TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_transfers_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_inv_trf BEFORE UPDATE ON inventory_transfers FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── inventory_transfer_lines ──
  await knex.schema.createTable('inventory_transfer_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('transfer_id').notNullable().references('id').inTable('inventory_transfers').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.bigInteger('lot_id').nullable().references('id').inTable('inventory_lots').onDelete('SET NULL');
    t.string('serial_number', 100).nullable();
    t.decimal('quantity', 10, 2).notNullable();
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE inventory_transfer_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_trfl_sel ON inventory_transfer_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_trfl_ins ON inventory_transfer_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_trfl_del ON inventory_transfer_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_trfl_mig ON inventory_transfer_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, DELETE ON inventory_transfer_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE inventory_transfer_lines_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('inventory_transfer_lines');
  await knex.schema.dropTableIfExists('inventory_transfers');
  await knex.schema.dropTableIfExists('inventory_adjustment_lines');
  await knex.schema.dropTableIfExists('inventory_adjustments');
  await knex.raw(`DROP TRIGGER IF EXISTS no_delete_inv_txn ON inventory_transactions`);
  await knex.raw(`DROP TRIGGER IF EXISTS no_update_inv_txn ON inventory_transactions`);
  await knex.raw(`DROP FUNCTION IF EXISTS prevent_inv_txn_mutation()`);
  await knex.schema.dropTableIfExists('inventory_transactions');
  await knex.schema.dropTableIfExists('inventory_lots');
  await knex.schema.dropTableIfExists('inventory_locations');
  await knex.schema.dropTableIfExists('products');
}
