// Migration: Add tax compliance fields to tenant_settings
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.string('tax_provider', 20).notNullable().defaultTo('manual');
    t.string('tax_provider_api_key', 500).nullable();
    t.boolean('tax_provider_sandbox').notNullable().defaultTo(true);
    t.bigInteger('default_tax_rate_id').nullable().references('id').inTable('tax_rates').onDelete('SET NULL');
    t.jsonb('nexus_states').notNullable().defaultTo(JSON.stringify(['TX']));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.dropColumn('tax_provider');
    t.dropColumn('tax_provider_api_key');
    t.dropColumn('tax_provider_sandbox');
    t.dropColumn('default_tax_rate_id');
    t.dropColumn('nexus_states');
  });
}
