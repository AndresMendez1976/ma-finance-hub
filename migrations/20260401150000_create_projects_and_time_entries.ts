// Migration: Create projects, time_entries, project_expenses for time tracking + project management
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── projects ──
  await knex.schema.createTable('projects', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.text('description').nullable();
    t.string('status', 20).notNullable().defaultTo('active');
    t.string('budget_type', 20).notNullable().defaultTo('hourly');
    t.decimal('budget_amount', 12, 2).nullable();
    t.decimal('hourly_rate', 12, 2).nullable();
    t.date('start_date').nullable();
    t.date('end_date').nullable();
    t.decimal('actual_revenue', 12, 2).notNullable().defaultTo(0);
    t.decimal('actual_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('profit', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE projects ADD CONSTRAINT proj_status_check CHECK (status IN ('active','completed','on_hold','cancelled'))`);
  await knex.raw(`ALTER TABLE projects ADD CONSTRAINT proj_budget_check CHECK (budget_type IN ('fixed_price','hourly','non_billable'))`);
  await knex.raw(`ALTER TABLE projects ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY proj_sel ON projects FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY proj_ins ON projects FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY proj_upd ON projects FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY proj_del ON projects FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY proj_mig ON projects FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE projects_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_proj BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── time_entries ──
  await knex.schema.createTable('time_entries', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('project_id').nullable().references('id').inTable('projects').onDelete('SET NULL');
    t.bigInteger('employee_id').nullable().references('id').inTable('employees').onDelete('SET NULL');
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.date('date').notNullable();
    t.time('start_time').nullable();
    t.time('end_time').nullable();
    t.integer('duration_minutes').notNullable().defaultTo(0);
    t.string('description', 500).notNullable();
    t.boolean('billable').notNullable().defaultTo(true);
    t.boolean('billed').notNullable().defaultTo(false);
    t.decimal('hourly_rate', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.string('status', 20).notNullable().defaultTo('draft');
    t.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE time_entries ADD CONSTRAINT te_status_check CHECK (status IN ('draft','approved','billed'))`);
  await knex.raw(`ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY te_sel ON time_entries FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY te_ins ON time_entries FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY te_upd ON time_entries FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY te_del ON time_entries FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY te_mig ON time_entries FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON time_entries TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE time_entries_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_te BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── project_expenses — link existing expenses to projects ──
  await knex.schema.createTable('project_expenses', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.bigInteger('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.timestamps(true, true);
  });
  await knex.raw(`CREATE UNIQUE INDEX pe_project_expense_uniq ON project_expenses (project_id, expense_id)`);
  await knex.raw(`ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pe_sel ON project_expenses FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pe_ins ON project_expenses FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pe_del ON project_expenses FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pe_mig ON project_expenses FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, DELETE ON project_expenses TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE project_expenses_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_expenses');
  await knex.schema.dropTableIfExists('time_entries');
  await knex.schema.dropTableIfExists('projects');
}
