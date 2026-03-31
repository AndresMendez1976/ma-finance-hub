// Migration: Create payroll tables — employees, payroll_runs, payroll_items, deduction_types, employee_deductions
// RLS enforced for tenant isolation.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── employees ──
  await knex.schema.createTable('employees', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('employee_number', 50).notNullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).notNullable();
    t.string('email', 255).notNullable();
    t.string('phone', 50).nullable();
    t.text('address').nullable();
    t.string('ssn_last4', 4).nullable();
    t.date('hire_date').notNullable();
    t.date('termination_date').nullable();
    t.string('status', 20).notNullable().defaultTo('active');
    t.string('pay_type', 20).notNullable();
    t.decimal('pay_rate', 12, 2).notNullable();
    t.string('pay_frequency', 20).notNullable();
    t.string('department', 100).nullable();
    t.string('position', 100).nullable();
    t.string('federal_filing_status', 30).notNullable().defaultTo('single');
    t.integer('federal_allowances').notNullable().defaultTo(0);
    t.string('state_filing_status', 50).nullable();
    t.integer('state_allowances').nullable();
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE employees ADD CONSTRAINT emp_status_check CHECK (status IN ('active','inactive','terminated'))`);
  await knex.raw(`ALTER TABLE employees ADD CONSTRAINT emp_pay_type_check CHECK (pay_type IN ('salary','hourly'))`);
  await knex.raw(`ALTER TABLE employees ADD CONSTRAINT emp_pay_frequency_check CHECK (pay_frequency IN ('weekly','biweekly','semimonthly','monthly'))`);
  await knex.raw(`ALTER TABLE employees ADD CONSTRAINT emp_fed_filing_check CHECK (federal_filing_status IN ('single','married','head_of_household'))`);
  await knex.raw(`CREATE UNIQUE INDEX emp_tenant_number_uniq ON employees (tenant_id, employee_number)`);
  await knex.raw(`CREATE INDEX emp_tenant_status_idx ON employees (tenant_id, status)`);
  await knex.raw(`ALTER TABLE employees ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY emp_tenant_sel ON employees FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY emp_tenant_ins ON employees FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY emp_tenant_upd ON employees FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY emp_tenant_del ON employees FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY emp_migration ON employees FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON employees TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE employees_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_employees BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── Auto-number function for employees ──
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_employee_number() RETURNS trigger AS $$
    DECLARE next_num integer;
    BEGIN
      SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 5) AS integer)), 0) + 1
        INTO next_num
        FROM employees
        WHERE tenant_id = NEW.tenant_id;
      IF NEW.employee_number IS NULL OR NEW.employee_number = '' THEN
        NEW.employee_number := 'EMP-' || LPAD(next_num::text, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`CREATE TRIGGER trg_employee_number BEFORE INSERT ON employees FOR EACH ROW EXECUTE FUNCTION generate_employee_number()`);

  // ── payroll_runs ──
  await knex.schema.createTable('payroll_runs', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('run_number', 50).notNullable();
    t.date('pay_period_start').notNullable();
    t.date('pay_period_end').notNullable();
    t.date('pay_date').notNullable();
    t.string('status', 20).notNullable().defaultTo('draft');
    t.decimal('total_gross', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_deductions', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_net', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_employer_taxes', 12, 2).notNullable().defaultTo(0);
    t.bigInteger('journal_entry_id').nullable().references('id').inTable('journal_entries').onDelete('SET NULL');
    t.text('notes').nullable();
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.bigInteger('approved_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE payroll_runs ADD CONSTRAINT pr_status_check CHECK (status IN ('draft','calculated','approved','posted'))`);
  await knex.raw(`CREATE UNIQUE INDEX pr_tenant_number_uniq ON payroll_runs (tenant_id, run_number)`);
  await knex.raw(`CREATE INDEX pr_tenant_status_idx ON payroll_runs (tenant_id, status)`);
  await knex.raw(`ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pr_tenant_sel ON payroll_runs FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pr_tenant_ins ON payroll_runs FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pr_tenant_upd ON payroll_runs FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pr_tenant_del ON payroll_runs FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pr_migration ON payroll_runs FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_runs TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE payroll_runs_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_payroll_runs BEFORE UPDATE ON payroll_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── Auto-number function for payroll_runs ──
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generate_payroll_run_number() RETURNS trigger AS $$
    DECLARE next_num integer;
    BEGIN
      SELECT COALESCE(MAX(CAST(SUBSTRING(run_number FROM 5) AS integer)), 0) + 1
        INTO next_num
        FROM payroll_runs
        WHERE tenant_id = NEW.tenant_id;
      IF NEW.run_number IS NULL OR NEW.run_number = '' THEN
        NEW.run_number := 'PAY-' || LPAD(next_num::text, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`CREATE TRIGGER trg_payroll_run_number BEFORE INSERT ON payroll_runs FOR EACH ROW EXECUTE FUNCTION generate_payroll_run_number()`);

  // ── payroll_items ──
  await knex.schema.createTable('payroll_items', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('payroll_run_id').notNullable().references('id').inTable('payroll_runs').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('employee_id').notNullable().references('id').inTable('employees').onDelete('RESTRICT');
    t.decimal('hours_worked', 10, 2).nullable();
    t.decimal('gross_pay', 12, 2).notNullable().defaultTo(0);
    t.decimal('federal_income_tax', 12, 2).notNullable().defaultTo(0);
    t.decimal('social_security_employee', 12, 2).notNullable().defaultTo(0);
    t.decimal('medicare_employee', 12, 2).notNullable().defaultTo(0);
    t.decimal('state_income_tax', 12, 2).notNullable().defaultTo(0);
    t.decimal('other_deductions', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_deductions', 12, 2).notNullable().defaultTo(0);
    t.decimal('net_pay', 12, 2).notNullable().defaultTo(0);
    t.decimal('social_security_employer', 12, 2).notNullable().defaultTo(0);
    t.decimal('medicare_employer', 12, 2).notNullable().defaultTo(0);
    t.decimal('futa_employer', 12, 2).notNullable().defaultTo(0);
    t.decimal('suta_employer', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_employer_taxes', 12, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
  await knex.raw(`CREATE INDEX pi_tenant_run_idx ON payroll_items (tenant_id, payroll_run_id)`);
  await knex.raw(`CREATE INDEX pi_tenant_employee_idx ON payroll_items (tenant_id, employee_id)`);
  await knex.raw(`ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pi_tenant_sel ON payroll_items FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pi_tenant_ins ON payroll_items FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pi_tenant_upd ON payroll_items FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pi_tenant_del ON payroll_items FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pi_migration ON payroll_items FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_items TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE payroll_items_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_payroll_items BEFORE UPDATE ON payroll_items FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── payroll_deduction_types ──
  await knex.schema.createTable('payroll_deduction_types', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.string('type', 20).notNullable();
    t.decimal('default_amount', 12, 2).nullable();
    t.decimal('default_percentage', 5, 2).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE payroll_deduction_types ADD CONSTRAINT pdt_type_check CHECK (type IN ('pre_tax','post_tax'))`);
  await knex.raw(`ALTER TABLE payroll_deduction_types ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY pdt_tenant_sel ON payroll_deduction_types FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pdt_tenant_ins ON payroll_deduction_types FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pdt_tenant_upd ON payroll_deduction_types FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pdt_tenant_del ON payroll_deduction_types FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY pdt_migration ON payroll_deduction_types FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_deduction_types TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE payroll_deduction_types_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_pdt BEFORE UPDATE ON payroll_deduction_types FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── employee_deductions ──
  await knex.schema.createTable('employee_deductions', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('employee_id').notNullable().references('id').inTable('employees').onDelete('CASCADE');
    t.bigInteger('deduction_type_id').notNullable().references('id').inTable('payroll_deduction_types').onDelete('CASCADE');
    t.decimal('amount', 12, 2).nullable();
    t.decimal('percentage', 5, 2).nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.raw(`CREATE INDEX ed_tenant_employee_idx ON employee_deductions (tenant_id, employee_id)`);
  await knex.raw(`ALTER TABLE employee_deductions ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY ed_tenant_sel ON employee_deductions FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ed_tenant_ins ON employee_deductions FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ed_tenant_upd ON employee_deductions FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ed_tenant_del ON employee_deductions FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ed_migration ON employee_deductions FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON employee_deductions TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE employee_deductions_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_ed BEFORE UPDATE ON employee_deductions FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('employee_deductions');
  await knex.schema.dropTableIfExists('payroll_deduction_types');
  await knex.schema.dropTableIfExists('payroll_items');
  await knex.raw(`DROP TRIGGER IF EXISTS trg_payroll_run_number ON payroll_runs`);
  await knex.raw(`DROP FUNCTION IF EXISTS generate_payroll_run_number()`);
  await knex.schema.dropTableIfExists('payroll_runs');
  await knex.raw(`DROP TRIGGER IF EXISTS trg_employee_number ON employees`);
  await knex.raw(`DROP FUNCTION IF EXISTS generate_employee_number()`);
  await knex.schema.dropTableIfExists('employees');
}
