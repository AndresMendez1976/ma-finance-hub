import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add lock_date to tenants — no journal operations allowed on or before this date
  await knex.schema.alterTable('tenants', (table) => {
    table.date('lock_date').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenants', (table) => {
    table.dropColumn('lock_date');
  });
}
