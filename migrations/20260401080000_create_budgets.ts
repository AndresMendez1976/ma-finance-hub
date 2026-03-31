// Migration: Create budgets and budget_lines tables for budget management.
// Supports draft → active → closed lifecycle.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── budgets ──
  await knex.schema.createTable('budgets', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.integer('fiscal_year').notNullable();
    t.string('period_type', 20).notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE budgets ADD CONSTRAINT budgets_period_type_check
    CHECK (period_type IN ('monthly', 'quarterly', 'annual'))
  `);
  await knex.raw(`
    ALTER TABLE budgets ADD CONSTRAINT budgets_status_check
    CHECK (status IN ('draft', 'active', 'closed'))
  `);

  await knex.raw(`CREATE INDEX budgets_tenant_idx ON budgets (tenant_id)`);
  await knex.raw(`CREATE INDEX budgets_tenant_year_idx ON budgets (tenant_id, fiscal_year)`);
  await knex.raw(`CREATE UNIQUE INDEX budgets_tenant_name_year_uniq ON budgets (tenant_id, name, fiscal_year)`);

  // RLS for budgets
  await knex.raw(`ALTER TABLE budgets ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY budgets_tenant_sel ON budgets FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY budgets_tenant_ins ON budgets FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY budgets_tenant_upd ON budgets FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY budgets_tenant_del ON budgets FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY budgets_migration ON budgets FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE budgets_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── budget_lines ──
  await knex.schema.createTable('budget_lines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('budget_id').notNullable().references('id').inTable('budgets').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.decimal('budgeted_amount', 12, 2).notNullable();
    t.text('notes').nullable();
    t.timestamps(true, true);
  });

  await knex.raw(`CREATE INDEX budget_lines_budget_idx ON budget_lines (budget_id)`);
  await knex.raw(`CREATE INDEX budget_lines_tenant_idx ON budget_lines (tenant_id)`);
  await knex.raw(`CREATE INDEX budget_lines_account_idx ON budget_lines (account_id)`);

  // RLS for budget_lines
  await knex.raw(`ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY bl_tenant_sel ON budget_lines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_tenant_ins ON budget_lines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_tenant_upd ON budget_lines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_tenant_del ON budget_lines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY bl_migration ON budget_lines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON budget_lines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE budget_lines_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_budget_lines BEFORE UPDATE ON budget_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_lines');
  await knex.schema.dropTableIfExists('budgets');
}
