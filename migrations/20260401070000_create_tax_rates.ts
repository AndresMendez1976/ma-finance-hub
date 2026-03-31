// Migration: Create tax_rates and tax_rate_components tables.
// Add tax_rate_id FK to invoices, expenses, purchase_orders.
// Optionally add taxable/tax_rate_override to invoice_lines if table exists.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── tax_rates ──
  await knex.schema.createTable('tax_rates', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.string('jurisdiction', 100).notNullable();
    t.decimal('rate', 8, 4).notNullable();
    t.boolean('is_compound').notNullable().defaultTo(false);
    t.boolean('is_default').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.text('description').nullable();
    t.date('effective_date').notNullable();
    t.date('expiration_date').nullable();
    t.timestamps(true, true);
  });

  await knex.raw(`CREATE INDEX tax_rates_tenant_idx ON tax_rates (tenant_id)`);
  await knex.raw(`CREATE INDEX tax_rates_tenant_active_idx ON tax_rates (tenant_id, is_active)`);

  // RLS for tax_rates
  await knex.raw(`ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY tr_tenant_sel ON tax_rates FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tr_tenant_ins ON tax_rates FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tr_tenant_upd ON tax_rates FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tr_tenant_del ON tax_rates FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY tr_migration ON tax_rates FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON tax_rates TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE tax_rates_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_tax_rates BEFORE UPDATE ON tax_rates FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── tax_rate_components ──
  await knex.schema.createTable('tax_rate_components', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tax_rate_id').notNullable().references('id').inTable('tax_rates').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.decimal('rate', 8, 4).notNullable();
    t.string('jurisdiction_level', 20).notNullable();
    t.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE tax_rate_components ADD CONSTRAINT trc_jurisdiction_level_check
    CHECK (jurisdiction_level IN ('federal', 'state', 'county', 'city', 'district'))
  `);

  await knex.raw(`CREATE INDEX trc_tax_rate_idx ON tax_rate_components (tax_rate_id)`);
  await knex.raw(`CREATE INDEX trc_tenant_idx ON tax_rate_components (tenant_id)`);

  // RLS for tax_rate_components
  await knex.raw(`ALTER TABLE tax_rate_components ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY trc_tenant_sel ON tax_rate_components FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY trc_tenant_ins ON tax_rate_components FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY trc_tenant_upd ON tax_rate_components FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY trc_tenant_del ON tax_rate_components FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY trc_migration ON tax_rate_components FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON tax_rate_components TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE tax_rate_components_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_tax_rate_components BEFORE UPDATE ON tax_rate_components FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── Add tax_rate_id FK to existing tables ──
  await knex.raw(`ALTER TABLE invoices ADD COLUMN tax_rate_id bigint REFERENCES tax_rates(id) ON DELETE SET NULL`);
  await knex.raw(`ALTER TABLE expenses ADD COLUMN tax_rate_id bigint REFERENCES tax_rates(id) ON DELETE SET NULL`);
  await knex.raw(`ALTER TABLE expenses ADD COLUMN tax_amount decimal(12,2) DEFAULT 0`);
  await knex.raw(`ALTER TABLE purchase_orders ADD COLUMN tax_rate_id bigint REFERENCES tax_rates(id) ON DELETE SET NULL`);

  // ── Conditionally add columns to invoice_lines if table exists ──
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice_lines') THEN
        ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS taxable boolean DEFAULT true;
        ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS tax_rate_override decimal(8,4);
      END IF;
    END
    $$
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove columns from invoice_lines if table exists
  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoice_lines') THEN
        ALTER TABLE invoice_lines DROP COLUMN IF EXISTS tax_rate_override;
        ALTER TABLE invoice_lines DROP COLUMN IF EXISTS taxable;
      END IF;
    END
    $$
  `);

  // Remove FK columns from existing tables
  await knex.raw(`ALTER TABLE purchase_orders DROP COLUMN IF EXISTS tax_rate_id`);
  await knex.raw(`ALTER TABLE expenses DROP COLUMN IF EXISTS tax_amount`);
  await knex.raw(`ALTER TABLE expenses DROP COLUMN IF EXISTS tax_rate_id`);
  await knex.raw(`ALTER TABLE invoices DROP COLUMN IF EXISTS tax_rate_id`);

  await knex.schema.dropTableIfExists('tax_rate_components');
  await knex.schema.dropTableIfExists('tax_rates');
}
