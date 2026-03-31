import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add entry_number column
  await knex.schema.alterTable('journal_entries', (table) => {
    table.integer('entry_number').nullable();
  });

  // Unique constraint per tenant + fiscal_period + entry_number
  await knex.raw(`
    CREATE UNIQUE INDEX idx_je_entry_number
    ON journal_entries (tenant_id, fiscal_period_id, entry_number)
    WHERE entry_number IS NOT NULL
  `);

  // DB-level trigger: prevent UPDATE on posted/voided journal entries (except status change to voided)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_posted_entry_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Allow status transition from posted to voided only
      IF OLD.status = 'posted' AND NEW.status = 'voided' AND
         OLD.tenant_id = NEW.tenant_id AND
         OLD.fiscal_period_id = NEW.fiscal_period_id AND
         OLD.entry_number IS NOT DISTINCT FROM NEW.entry_number THEN
        RETURN NEW;
      END IF;
      -- Block all other changes to posted or voided entries
      IF OLD.status IN ('posted', 'voided') THEN
        RAISE EXCEPTION 'Cannot modify a % journal entry', OLD.status;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
    SET search_path = public
  `);

  await knex.raw(`
    CREATE TRIGGER trg_journal_entries_immutability
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_posted_entry_mutation()
  `);

  // Prevent DELETE on posted/voided entries
  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_posted_entry_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.status IN ('posted', 'voided') THEN
        RAISE EXCEPTION 'Cannot delete a % journal entry', OLD.status;
      END IF;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql
    SET search_path = public
  `);

  await knex.raw(`
    CREATE TRIGGER trg_journal_entries_no_delete
    BEFORE DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_posted_entry_delete()
  `);

  // Prevent modification of journal_lines belonging to posted/voided entries
  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_posted_lines_mutation()
    RETURNS TRIGGER AS $$
    DECLARE
      entry_status text;
    BEGIN
      SELECT status INTO entry_status FROM journal_entries WHERE id = COALESCE(OLD.journal_entry_id, NEW.journal_entry_id);
      IF entry_status IN ('posted', 'voided') THEN
        RAISE EXCEPTION 'Cannot modify lines of a % journal entry', entry_status;
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
    SET search_path = public
  `);

  await knex.raw('CREATE TRIGGER trg_journal_lines_immutability BEFORE UPDATE OR DELETE ON journal_lines FOR EACH ROW EXECUTE FUNCTION prevent_posted_lines_mutation()');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_journal_lines_immutability ON journal_lines');
  await knex.raw('DROP FUNCTION IF EXISTS prevent_posted_lines_mutation()');
  await knex.raw('DROP TRIGGER IF EXISTS trg_journal_entries_no_delete ON journal_entries');
  await knex.raw('DROP FUNCTION IF EXISTS prevent_posted_entry_delete()');
  await knex.raw('DROP TRIGGER IF EXISTS trg_journal_entries_immutability ON journal_entries');
  await knex.raw('DROP FUNCTION IF EXISTS prevent_posted_entry_mutation()');
  await knex.raw('DROP INDEX IF EXISTS idx_je_entry_number');
  await knex.schema.alterTable('journal_entries', (table) => { table.dropColumn('entry_number'); });
}
