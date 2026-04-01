// Migration: Add form fields to invoices (contact_id, tax_rate_id, project_id, internal_memo, po_number, payment_terms)
// Uses ADD COLUMN IF NOT EXISTS to be idempotent with prior migrations
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add columns only if they don't already exist
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'contact_id') THEN
        ALTER TABLE invoices ADD COLUMN contact_id bigint REFERENCES contacts(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_rate_id') THEN
        ALTER TABLE invoices ADD COLUMN tax_rate_id bigint REFERENCES tax_rates(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'project_id') THEN
        ALTER TABLE invoices ADD COLUMN project_id bigint REFERENCES projects(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'internal_memo') THEN
        ALTER TABLE invoices ADD COLUMN internal_memo text;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'po_number') THEN
        ALTER TABLE invoices ADD COLUMN po_number varchar(100);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_terms') THEN
        ALTER TABLE invoices ADD COLUMN payment_terms varchar(50);
      END IF;
    END
    $$;
  `);

  // Add indexes for new FK columns
  await knex.raw(`CREATE INDEX IF NOT EXISTS invoices_contact_id_idx ON invoices (contact_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS invoices_tax_rate_id_idx ON invoices (tax_rate_id)`);
  await knex.raw(`CREATE INDEX IF NOT EXISTS invoices_project_id_idx ON invoices (project_id)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS invoices_project_id_idx`);
  await knex.raw(`DROP INDEX IF EXISTS invoices_tax_rate_id_idx`);
  await knex.raw(`DROP INDEX IF EXISTS invoices_contact_id_idx`);

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_terms') THEN
        ALTER TABLE invoices DROP COLUMN payment_terms;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'po_number') THEN
        ALTER TABLE invoices DROP COLUMN po_number;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'internal_memo') THEN
        ALTER TABLE invoices DROP COLUMN internal_memo;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'project_id') THEN
        ALTER TABLE invoices DROP COLUMN project_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'tax_rate_id') THEN
        ALTER TABLE invoices DROP COLUMN tax_rate_id;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'contact_id') THEN
        ALTER TABLE invoices DROP COLUMN contact_id;
      END IF;
    END
    $$;
  `);
}
