// Migration: Create bank_accounts and bank_transactions for manual reconciliation
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('bank_accounts', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.string('institution', 255).nullable();
    t.string('account_number_last4', 4).nullable();
    t.string('currency', 10).notNullable().defaultTo('USD');
    t.decimal('current_balance', 12, 2).notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('active');
    t.timestamps(true, true);
  });

  await knex.raw(`ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_status_check CHECK (status IN ('active','inactive'))`);
  await knex.raw(`CREATE INDEX bank_accounts_tenant_idx ON bank_accounts (tenant_id)`);
  await knex.raw(`ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bank_accounts_tenant_select ON bank_accounts FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_accounts_tenant_insert ON bank_accounts FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_accounts_tenant_update ON bank_accounts FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_accounts_tenant_delete ON bank_accounts FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_accounts_migration_all ON bank_accounts FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bank_accounts_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_bank_accounts BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  await knex.schema.createTable('bank_transactions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('bank_account_id').notNullable().references('id').inTable('bank_accounts').onDelete('CASCADE');
    t.date('date').notNullable();
    t.string('description', 500).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('type', 20).notNullable().defaultTo('deposit');
    t.string('reference', 100).nullable();
    t.boolean('reconciled').notNullable().defaultTo(false);
    t.date('reconciled_date').nullable();
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamps(true, true);
  });

  await knex.raw(`ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_type_check CHECK (type IN ('deposit','withdrawal','transfer','fee','interest'))`);
  await knex.raw(`CREATE INDEX bank_txn_account_idx ON bank_transactions (bank_account_id)`);
  await knex.raw(`CREATE INDEX bank_txn_tenant_idx ON bank_transactions (tenant_id)`);
  await knex.raw(`CREATE INDEX bank_txn_reconciled_idx ON bank_transactions (bank_account_id, reconciled)`);
  await knex.raw(`ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bank_txn_tenant_select ON bank_transactions FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_txn_tenant_insert ON bank_transactions FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_txn_tenant_update ON bank_transactions FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_txn_tenant_delete ON bank_transactions FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bank_txn_migration_all ON bank_transactions FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_transactions TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bank_transactions_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_bank_transactions BEFORE UPDATE ON bank_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bank_transactions');
  await knex.schema.dropTableIfExists('bank_accounts');
}
