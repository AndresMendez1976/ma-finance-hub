import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Reusable trigger function for any table with updated_at
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Apply to schema_metadata (fixes Day 3 pending)
  await knex.raw(`
    CREATE TRIGGER trg_schema_metadata_updated_at
    BEFORE UPDATE ON schema_metadata
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_schema_metadata_updated_at ON schema_metadata');
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at()');
}
