// Migration: Add subscription tier and trial fields to tenant_settings
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.string('subscription_tier', 20).notNullable().defaultTo('starter');
    t.string('subscription_status', 20).notNullable().defaultTo('trial');
    t.timestamp('trial_ends_at').nullable();
    t.string('billing_email', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.dropColumn('subscription_tier');
    t.dropColumn('subscription_status');
    t.dropColumn('trial_ends_at');
    t.dropColumn('billing_email');
  });
}
