import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chart_of_accounts', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'name']);
    table.index(['tenant_id']);
  });

  await knex.raw(`
    CREATE TRIGGER trg_chart_of_accounts_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at()
  `);

  // RLS
  await knex.raw('ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY');

  await knex.raw(`
    CREATE POLICY tenant_isolation_select ON chart_of_accounts
      FOR SELECT TO app_user
      USING (tenant_id = app_current_tenant_id())
  `);
  await knex.raw(`
    CREATE POLICY tenant_isolation_insert ON chart_of_accounts
      FOR INSERT TO app_user
      WITH CHECK (tenant_id = app_current_tenant_id())
  `);
  await knex.raw(`
    CREATE POLICY tenant_isolation_update ON chart_of_accounts
      FOR UPDATE TO app_user
      USING (tenant_id = app_current_tenant_id())
      WITH CHECK (tenant_id = app_current_tenant_id())
  `);
  await knex.raw(`
    CREATE POLICY tenant_isolation_delete ON chart_of_accounts
      FOR DELETE TO app_user
      USING (tenant_id = app_current_tenant_id())
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON chart_of_accounts');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON chart_of_accounts');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON chart_of_accounts');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON chart_of_accounts');
  await knex.raw('DROP TRIGGER IF EXISTS trg_chart_of_accounts_updated_at ON chart_of_accounts');
  await knex.schema.dropTableIfExists('chart_of_accounts');
}
