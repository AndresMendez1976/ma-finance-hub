// Migration: Create fixed assets tables — fixed_assets, depreciation_entries, maintenance_records, maintenance_schedules
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── fixed_assets ──
  await knex.schema.createTable('fixed_assets', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('asset_number', 50).notNullable();
    t.string('name', 255).notNullable();
    t.text('description').nullable();
    t.string('category', 100).notNullable();
    t.string('serial_number', 100).nullable();
    t.string('location', 255).nullable();
    t.date('purchase_date').notNullable();
    t.decimal('purchase_price', 12, 2).notNullable();
    t.decimal('salvage_value', 12, 2).notNullable().defaultTo(0);
    t.integer('useful_life_months').notNullable();
    t.string('depreciation_method', 30).notNullable();
    t.bigInteger('asset_account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.bigInteger('depreciation_expense_account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.bigInteger('accumulated_depreciation_account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.string('status', 30).notNullable().defaultTo('active');
    t.date('disposal_date').nullable();
    t.decimal('disposal_price', 12, 2).nullable();
    t.bigInteger('disposal_journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE fixed_assets ADD CONSTRAINT fa_depr_method_check CHECK (depreciation_method IN ('straight_line','declining_balance'))`);
  await knex.raw(`ALTER TABLE fixed_assets ADD CONSTRAINT fa_status_check CHECK (status IN ('active','disposed','fully_depreciated'))`);
  await knex.raw(`CREATE UNIQUE INDEX fa_tenant_number_uniq ON fixed_assets (tenant_id, asset_number)`);
  await knex.raw(`CREATE INDEX fa_tenant_status_idx ON fixed_assets (tenant_id, status)`);
  await knex.raw(`CREATE INDEX fa_tenant_category_idx ON fixed_assets (tenant_id, category)`);
  await knex.raw(`ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY fa_tenant_sel ON fixed_assets FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY fa_tenant_ins ON fixed_assets FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY fa_tenant_upd ON fixed_assets FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY fa_tenant_del ON fixed_assets FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY fa_migration ON fixed_assets FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON fixed_assets TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE fixed_assets_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_fa BEFORE UPDATE ON fixed_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── Auto-number function for fixed_assets ──
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_asset_number() RETURNS trigger AS $$
    DECLARE next_num integer;
    BEGIN
      SELECT COALESCE(MAX(CAST(SUBSTRING(asset_number FROM 4) AS integer)), 0) + 1
        INTO next_num
        FROM fixed_assets
        WHERE tenant_id = NEW.tenant_id;
      IF NEW.asset_number IS NULL OR NEW.asset_number = '' THEN
        NEW.asset_number := 'FA-' || LPAD(next_num::text, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`CREATE TRIGGER trg_asset_number BEFORE INSERT ON fixed_assets FOR EACH ROW EXECUTE FUNCTION generate_asset_number()`);

  // ── depreciation_entries ──
  await knex.schema.createTable('depreciation_entries', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('fixed_asset_id').notNullable().references('id').inTable('fixed_assets').onDelete('CASCADE');
    t.date('period_date').notNullable();
    t.decimal('depreciation_amount', 12, 2).notNullable();
    t.decimal('accumulated_total', 12, 2).notNullable();
    t.decimal('book_value', 12, 2).notNullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`CREATE INDEX de_tenant_asset_idx ON depreciation_entries (tenant_id, fixed_asset_id)`);
  await knex.raw(`CREATE INDEX de_tenant_period_idx ON depreciation_entries (tenant_id, period_date)`);
  await knex.raw(`ALTER TABLE depreciation_entries ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY de_tenant_sel ON depreciation_entries FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY de_tenant_ins ON depreciation_entries FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY de_tenant_upd ON depreciation_entries FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY de_tenant_del ON depreciation_entries FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY de_migration ON depreciation_entries FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON depreciation_entries TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE depreciation_entries_id_seq TO app_user`);

  // ── maintenance_records ──
  await knex.schema.createTable('maintenance_records', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('fixed_asset_id').notNullable().references('id').inTable('fixed_assets').onDelete('CASCADE');
    t.string('maintenance_type', 20).notNullable();
    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.date('scheduled_date').notNullable();
    t.date('completed_date').nullable();
    t.string('status', 20).notNullable().defaultTo('scheduled');
    t.decimal('cost', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('vendor_contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.bigInteger('expense_id').nullable().references('id').inTable('expenses').onDelete('SET NULL');
    t.text('notes').nullable();
    t.string('assigned_to', 255).nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE maintenance_records ADD CONSTRAINT mr_type_check CHECK (maintenance_type IN ('preventive','corrective','inspection'))`);
  await knex.raw(`ALTER TABLE maintenance_records ADD CONSTRAINT mr_status_check CHECK (status IN ('scheduled','in_progress','completed','overdue'))`);
  await knex.raw(`CREATE INDEX mr_tenant_asset_idx ON maintenance_records (tenant_id, fixed_asset_id)`);
  await knex.raw(`CREATE INDEX mr_tenant_status_idx ON maintenance_records (tenant_id, status)`);
  await knex.raw(`ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY mr_tenant_sel ON maintenance_records FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY mr_tenant_ins ON maintenance_records FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY mr_tenant_upd ON maintenance_records FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY mr_tenant_del ON maintenance_records FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY mr_migration ON maintenance_records FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_records TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE maintenance_records_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_mr BEFORE UPDATE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── maintenance_schedules ──
  await knex.schema.createTable('maintenance_schedules', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('fixed_asset_id').notNullable().references('id').inTable('fixed_assets').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.string('frequency', 20).notNullable();
    t.date('next_due_date').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE maintenance_schedules ADD CONSTRAINT ms_frequency_check CHECK (frequency IN ('daily','weekly','monthly','quarterly','semi_annual','annual'))`);
  await knex.raw(`CREATE INDEX ms_tenant_asset_idx ON maintenance_schedules (tenant_id, fixed_asset_id)`);
  await knex.raw(`CREATE INDEX ms_tenant_due_idx ON maintenance_schedules (tenant_id, next_due_date)`);
  await knex.raw(`ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY ms_tenant_sel ON maintenance_schedules FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ms_tenant_ins ON maintenance_schedules FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ms_tenant_upd ON maintenance_schedules FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ms_tenant_del ON maintenance_schedules FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ms_migration ON maintenance_schedules FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON maintenance_schedules TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE maintenance_schedules_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_ms BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('maintenance_schedules');
  await knex.schema.dropTableIfExists('maintenance_records');
  await knex.schema.dropTableIfExists('depreciation_entries');
  await knex.raw(`DROP TRIGGER IF EXISTS trg_asset_number ON fixed_assets`);
  await knex.raw(`DROP FUNCTION IF EXISTS generate_asset_number()`);
  await knex.schema.dropTableIfExists('fixed_assets');
}
