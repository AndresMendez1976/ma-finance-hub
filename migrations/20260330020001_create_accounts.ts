import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accounts', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table
      .bigInteger('chart_id')
      .notNullable()
      .references('id')
      .inTable('chart_of_accounts')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('account_code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.string('account_type', 50).notNullable();
    table.bigInteger('parent_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL').onUpdate('CASCADE');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'chart_id', 'account_code']);
    table.index(['tenant_id', 'chart_id']);
  });

  await knex.raw(`
    ALTER TABLE accounts
    ADD CONSTRAINT chk_account_type CHECK (
      account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')
    )
  `);

  await knex.raw(`
    CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);

  await knex.raw('ALTER TABLE accounts ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON accounts FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_insert ON accounts FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_update ON accounts FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_delete ON accounts FOR DELETE TO app_user USING (tenant_id = app_current_tenant_id())`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON accounts');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON accounts');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON accounts');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON accounts');
  await knex.raw('DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts');
  await knex.schema.dropTableIfExists('accounts');
}
