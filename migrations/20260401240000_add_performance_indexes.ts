// Migration: Add performance indexes for frequently queried tables
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Invoices — frequently filtered by status, contact, due_date
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant_contact ON invoices (tenant_id, contact_id) WHERE contact_id IS NOT NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_invoices_tenant_due ON invoices (tenant_id, due_date)`);

  // Journal entries and lines — critical for financial reports
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_je_tenant_status ON journal_entries (tenant_id, status)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_je_tenant_date ON journal_entries (tenant_id, posted_at) WHERE status = 'posted'`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_jl_tenant_account ON journal_lines (tenant_id, account_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_jl_journal_entry ON journal_lines (journal_entry_id)`);

  // Time entries — for project and employee lookups
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_te_tenant_project ON time_entries (tenant_id, project_id) WHERE project_id IS NOT NULL`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_te_tenant_emp_date ON time_entries (tenant_id, employee_id, date) WHERE employee_id IS NOT NULL`);

  // Products — for inventory lookups
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_products_tenant_type ON products (tenant_id, type)`);

  // Contacts — for customer/vendor lookups
  await knex.raw(`CREATE INDEX IF NOT EXISTS idx_contacts_tenant_email ON contacts (tenant_id, email) WHERE email IS NOT NULL`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_contacts_tenant_email`);
  await knex.raw(`DROP INDEX IF EXISTS idx_products_tenant_type`);
  await knex.raw(`DROP INDEX IF EXISTS idx_te_tenant_emp_date`);
  await knex.raw(`DROP INDEX IF EXISTS idx_te_tenant_project`);
  await knex.raw(`DROP INDEX IF EXISTS idx_jl_journal_entry`);
  await knex.raw(`DROP INDEX IF EXISTS idx_jl_tenant_account`);
  await knex.raw(`DROP INDEX IF EXISTS idx_je_tenant_date`);
  await knex.raw(`DROP INDEX IF EXISTS idx_je_tenant_status`);
  await knex.raw(`DROP INDEX IF EXISTS idx_invoices_tenant_due`);
  await knex.raw(`DROP INDEX IF EXISTS idx_invoices_tenant_contact`);
}
