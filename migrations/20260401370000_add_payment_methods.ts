// Migration: Add payment methods + Plaid fields
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Payment method fields on tenant_settings ──
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.text('payment_instructions').nullable();
    t.string('bank_name', 255).nullable();
    t.string('bank_routing_last4', 4).nullable();
    t.string('bank_account_last4', 4).nullable();
    t.string('paypal_email', 255).nullable();
    t.string('venmo_handle', 100).nullable();
    t.string('zelle_phone', 20).nullable();
    t.string('plaid_client_id', 500).nullable();
    t.string('plaid_secret', 500).nullable();
    t.string('plaid_environment', 20).notNullable().defaultTo('sandbox');
  });

  // ── Plaid fields on bank_accounts ──
  await knex.schema.alterTable('bank_accounts', (t) => {
    t.string('plaid_access_token', 500).nullable();
    t.string('plaid_item_id', 255).nullable();
    t.string('plaid_account_id', 255).nullable();
    t.string('plaid_institution_name', 255).nullable();
    t.timestamp('plaid_last_sync').nullable();
    t.boolean('sync_enabled').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('bank_accounts', (t) => {
    t.dropColumn('plaid_access_token');
    t.dropColumn('plaid_item_id');
    t.dropColumn('plaid_account_id');
    t.dropColumn('plaid_institution_name');
    t.dropColumn('plaid_last_sync');
    t.dropColumn('sync_enabled');
  });

  await knex.schema.alterTable('tenant_settings', (t) => {
    t.dropColumn('payment_instructions');
    t.dropColumn('bank_name');
    t.dropColumn('bank_routing_last4');
    t.dropColumn('bank_account_last4');
    t.dropColumn('paypal_email');
    t.dropColumn('venmo_handle');
    t.dropColumn('zelle_phone');
    t.dropColumn('plaid_client_id');
    t.dropColumn('plaid_secret');
    t.dropColumn('plaid_environment');
  });
}
