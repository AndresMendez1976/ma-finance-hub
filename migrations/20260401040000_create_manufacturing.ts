// Migration: Create manufacturing tables — bill_of_materials, bom_lines, bom_labor, bom_overhead,
// work_orders, work_order_material_usage, work_order_labor
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── bill_of_materials ──
  await knex.schema.createTable('bill_of_materials', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.string('version', 10).notNullable().defaultTo('1.0');
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('yield_quantity', 10, 2).notNullable().defaultTo(1);
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE bill_of_materials ADD CONSTRAINT bom_status_check CHECK (status IN ('active','inactive','draft'))`);
  await knex.raw(`CREATE INDEX bom_tenant_product_idx ON bill_of_materials (tenant_id, product_id)`);
  await knex.raw(`ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bom_tenant_sel ON bill_of_materials FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_tenant_ins ON bill_of_materials FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_tenant_upd ON bill_of_materials FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_tenant_del ON bill_of_materials FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_migration ON bill_of_materials FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bill_of_materials TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bill_of_materials_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_bom BEFORE UPDATE ON bill_of_materials FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── bom_lines ──
  await knex.schema.createTable('bom_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('bom_id').notNullable().references('id').inTable('bill_of_materials').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('component_product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.decimal('quantity_required', 10, 2).notNullable();
    t.string('unit_of_measure', 50).notNullable();
    t.decimal('waste_percentage', 5, 2).notNullable().defaultTo(0);
    t.decimal('cost_per_unit', 12, 2).nullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.text('notes').nullable();
    t.timestamps(true, true);
  });
  await knex.raw(`CREATE INDEX bom_lines_bom_idx ON bom_lines (bom_id)`);
  await knex.raw(`ALTER TABLE bom_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY boml_tenant_sel ON bom_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY boml_tenant_ins ON bom_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY boml_tenant_upd ON bom_lines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY boml_tenant_del ON bom_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY boml_migration ON bom_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bom_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bom_lines_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_boml BEFORE UPDATE ON bom_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── bom_labor ──
  await knex.schema.createTable('bom_labor', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('bom_id').notNullable().references('id').inTable('bill_of_materials').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 255).notNullable();
    t.decimal('hours_required', 10, 2).notNullable();
    t.decimal('hourly_rate', 12, 2).notNullable();
    t.decimal('total_cost', 12, 2).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE bom_labor ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bom_lab_tenant_sel ON bom_labor FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_lab_tenant_ins ON bom_labor FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_lab_tenant_upd ON bom_labor FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_lab_tenant_del ON bom_labor FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_lab_migration ON bom_labor FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bom_labor TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bom_labor_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_bom_lab BEFORE UPDATE ON bom_labor FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── bom_overhead ──
  await knex.schema.createTable('bom_overhead', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('bom_id').notNullable().references('id').inTable('bill_of_materials').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('description', 255).notNullable();
    t.string('cost_type', 20).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE bom_overhead ADD CONSTRAINT bom_oh_cost_type_check CHECK (cost_type IN ('fixed','per_unit'))`);
  await knex.raw(`ALTER TABLE bom_overhead ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bom_oh_tenant_sel ON bom_overhead FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_oh_tenant_ins ON bom_overhead FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_oh_tenant_upd ON bom_overhead FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_oh_tenant_del ON bom_overhead FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bom_oh_migration ON bom_overhead FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bom_overhead TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bom_overhead_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_bom_oh BEFORE UPDATE ON bom_overhead FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── work_orders ──
  await knex.schema.createTable('work_orders', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('wo_number', 50).notNullable();
    t.bigInteger('bom_id').notNullable().references('id').inTable('bill_of_materials').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.decimal('quantity_to_produce', 10, 2).notNullable().defaultTo(0);
    t.decimal('quantity_produced', 10, 2).notNullable().defaultTo(0);
    t.decimal('quantity_scrapped', 10, 2).notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('draft');
    t.string('priority', 10).notNullable().defaultTo('normal');
    t.date('scheduled_start').nullable();
    t.date('scheduled_end').nullable();
    t.date('actual_start').nullable();
    t.date('actual_end').nullable();
    t.bigInteger('location_id').nullable().references('id').inTable('inventory_locations').onDelete('SET NULL');
    t.decimal('estimated_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('actual_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('variance', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.text('notes').nullable();
    t.string('assigned_to', 255).nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE work_orders ADD CONSTRAINT wo_status_check CHECK (status IN ('draft','released','in_progress','completed','cancelled'))`);
  await knex.raw(`ALTER TABLE work_orders ADD CONSTRAINT wo_priority_check CHECK (priority IN ('low','normal','high','urgent'))`);
  await knex.raw(`CREATE UNIQUE INDEX wo_tenant_number_uniq ON work_orders (tenant_id, wo_number)`);
  await knex.raw(`CREATE INDEX wo_tenant_status_idx ON work_orders (tenant_id, status)`);
  await knex.raw(`ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY wo_tenant_sel ON work_orders FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wo_tenant_ins ON work_orders FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wo_tenant_upd ON work_orders FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wo_tenant_del ON work_orders FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wo_migration ON work_orders FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON work_orders TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE work_orders_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_wo BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── Auto-number function for work_orders ──
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_wo_number() RETURNS trigger AS $$
    DECLARE next_num integer;
    BEGIN
      SELECT COALESCE(MAX(CAST(SUBSTRING(wo_number FROM 4) AS integer)), 0) + 1
        INTO next_num
        FROM work_orders
        WHERE tenant_id = NEW.tenant_id;
      IF NEW.wo_number IS NULL OR NEW.wo_number = '' THEN
        NEW.wo_number := 'WO-' || LPAD(next_num::text, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`CREATE TRIGGER trg_wo_number BEFORE INSERT ON work_orders FOR EACH ROW EXECUTE FUNCTION generate_wo_number()`);

  // ── work_order_material_usage ──
  await knex.schema.createTable('work_order_material_usage', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('work_order_id').notNullable().references('id').inTable('work_orders').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('product_id').notNullable().references('id').inTable('products').onDelete('RESTRICT');
    t.decimal('quantity_used', 10, 2).notNullable();
    t.decimal('unit_cost', 12, 2).notNullable();
    t.decimal('total_cost', 12, 2).notNullable();
    t.bigInteger('inventory_transaction_id').nullable().references('id').inTable('inventory_transactions').onDelete('SET NULL');
    t.date('date').notNullable();
    t.text('notes').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`CREATE INDEX womu_tenant_wo_idx ON work_order_material_usage (tenant_id, work_order_id)`);
  await knex.raw(`ALTER TABLE work_order_material_usage ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY womu_tenant_sel ON work_order_material_usage FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY womu_tenant_ins ON work_order_material_usage FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY womu_tenant_upd ON work_order_material_usage FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY womu_tenant_del ON work_order_material_usage FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY womu_migration ON work_order_material_usage FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON work_order_material_usage TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE work_order_material_usage_id_seq TO app_user`);

  // ── work_order_labor ──
  await knex.schema.createTable('work_order_labor', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('work_order_id').notNullable().references('id').inTable('work_orders').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('employee_id').nullable().references('id').inTable('employees').onDelete('SET NULL');
    t.string('description', 255).notNullable();
    t.decimal('hours_worked', 10, 2).notNullable();
    t.decimal('hourly_rate', 12, 2).notNullable();
    t.decimal('total_cost', 12, 2).notNullable();
    t.date('date').notNullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`CREATE INDEX wol_tenant_wo_idx ON work_order_labor (tenant_id, work_order_id)`);
  await knex.raw(`ALTER TABLE work_order_labor ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY wol_tenant_sel ON work_order_labor FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wol_tenant_ins ON work_order_labor FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wol_tenant_upd ON work_order_labor FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wol_tenant_del ON work_order_labor FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY wol_migration ON work_order_labor FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON work_order_labor TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE work_order_labor_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('work_order_labor');
  await knex.schema.dropTableIfExists('work_order_material_usage');
  await knex.raw(`DROP TRIGGER IF EXISTS trg_wo_number ON work_orders`);
  await knex.raw(`DROP FUNCTION IF EXISTS generate_wo_number()`);
  await knex.schema.dropTableIfExists('work_orders');
  await knex.schema.dropTableIfExists('bom_overhead');
  await knex.schema.dropTableIfExists('bom_labor');
  await knex.schema.dropTableIfExists('bom_lines');
  await knex.schema.dropTableIfExists('bill_of_materials');
}
