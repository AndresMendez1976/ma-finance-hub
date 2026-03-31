// Migration: Enhance audit_log with IP address, user agent, old/new values for data export
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('audit_log', (t) => {
    t.string('ip_address', 45).nullable();
    t.string('user_agent', 500).nullable();
    t.jsonb('old_values').nullable();
    t.jsonb('new_values').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('audit_log', (t) => {
    t.dropColumn('ip_address');
    t.dropColumn('user_agent');
    t.dropColumn('old_values');
    t.dropColumn('new_values');
  });
}
