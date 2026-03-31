// Migration: Create currencies (global) and exchange_rates (per-tenant) tables.
// Add currency + exchange_rate columns to invoices, expenses, purchase_orders.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── currencies (global, no tenant_id, no RLS) ──
  await knex.schema.createTable('currencies', (t) => {
    t.bigIncrements('id').primary();
    t.string('code', 3).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('symbol', 10).notNullable();
    t.integer('decimal_places').notNullable().defaultTo(2);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`GRANT SELECT ON currencies TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE currencies_id_seq TO app_user`);
  await knex.raw(`CREATE POLICY currencies_migration_all ON currencies FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  // Seed currencies
  await knex.raw(`
    INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
      ('USD', 'US Dollar', '$', 2),
      ('EUR', 'Euro', '€', 2),
      ('GBP', 'British Pound', '£', 2),
      ('MXN', 'Mexican Peso', '$', 2),
      ('CAD', 'Canadian Dollar', '$', 2),
      ('JPY', 'Japanese Yen', '¥', 0),
      ('CHF', 'Swiss Franc', 'Fr', 2),
      ('AUD', 'Australian Dollar', '$', 2),
      ('BRL', 'Brazilian Real', 'R$', 2),
      ('CNY', 'Chinese Yuan', '¥', 2)
  `);

  // ── exchange_rates (tenant-scoped) ──
  await knex.schema.createTable('exchange_rates', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('from_currency', 3).notNullable();
    t.string('to_currency', 3).notNullable();
    t.decimal('rate', 18, 8).notNullable();
    t.date('effective_date').notNullable();
    t.string('source', 50).notNullable().defaultTo('manual');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`CREATE INDEX exchange_rates_tenant_idx ON exchange_rates (tenant_id)`);
  await knex.raw(`CREATE INDEX exchange_rates_tenant_pair_date_idx ON exchange_rates (tenant_id, from_currency, to_currency, effective_date)`);

  // RLS for exchange_rates
  await knex.raw(`ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY er_tenant_sel ON exchange_rates FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY er_tenant_ins ON exchange_rates FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY er_tenant_upd ON exchange_rates FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY er_tenant_del ON exchange_rates FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY er_migration ON exchange_rates FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON exchange_rates TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE exchange_rates_id_seq TO app_user`);

  // ── Add currency columns to existing tables ──
  await knex.raw(`ALTER TABLE invoices ADD COLUMN currency varchar(3) DEFAULT 'USD'`);
  await knex.raw(`ALTER TABLE invoices ADD COLUMN exchange_rate decimal(18,8) DEFAULT 1`);

  await knex.raw(`ALTER TABLE expenses ADD COLUMN currency varchar(3) DEFAULT 'USD'`);
  await knex.raw(`ALTER TABLE expenses ADD COLUMN exchange_rate decimal(18,8) DEFAULT 1`);

  await knex.raw(`ALTER TABLE purchase_orders ADD COLUMN currency varchar(3) DEFAULT 'USD'`);
  await knex.raw(`ALTER TABLE purchase_orders ADD COLUMN exchange_rate decimal(18,8) DEFAULT 1`);
}

export async function down(knex: Knex): Promise<void> {
  // Remove currency columns from existing tables
  await knex.raw(`ALTER TABLE purchase_orders DROP COLUMN IF EXISTS exchange_rate`);
  await knex.raw(`ALTER TABLE purchase_orders DROP COLUMN IF EXISTS currency`);
  await knex.raw(`ALTER TABLE expenses DROP COLUMN IF EXISTS exchange_rate`);
  await knex.raw(`ALTER TABLE expenses DROP COLUMN IF EXISTS currency`);
  await knex.raw(`ALTER TABLE invoices DROP COLUMN IF EXISTS exchange_rate`);
  await knex.raw(`ALTER TABLE invoices DROP COLUMN IF EXISTS currency`);

  await knex.schema.dropTableIfExists('exchange_rates');
  await knex.schema.dropTableIfExists('currencies');
}
