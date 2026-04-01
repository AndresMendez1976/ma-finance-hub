// Migration: Add 1099 eligibility and tax ID fields to contacts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contacts', (t) => {
    t.boolean('is_1099_eligible').notNullable().defaultTo(false);
    t.string('tax_id_type', 10).nullable();
    t.string('tax_id_encrypted', 500).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contacts', (t) => {
    t.dropColumn('is_1099_eligible');
    t.dropColumn('tax_id_type');
    t.dropColumn('tax_id_encrypted');
  });
}
