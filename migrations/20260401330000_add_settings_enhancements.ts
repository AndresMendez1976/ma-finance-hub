// Migration: Add settings enhancements — logo upload, invoice template customization, Stripe billing
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Add columns to tenant_settings ──
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.text('logo_base64').nullable();
    t.string('invoice_template', 20).notNullable().defaultTo('classic');
    t.string('invoice_color_primary', 7).notNullable().defaultTo('#2D6A4F');
    t.string('invoice_color_secondary', 7).notNullable().defaultTo('#E8DCC8');
    t.text('invoice_footer_text').nullable();
    t.text('invoice_payment_terms').nullable();
    t.text('invoice_notes_default').nullable();
    t.boolean('show_logo_on_invoice').notNullable().defaultTo(true);
    t.boolean('show_company_address').notNullable().defaultTo(true);
    t.boolean('show_tax_id').notNullable().defaultTo(false);
    t.string('stripe_publishable_key', 500).nullable();
    t.string('stripe_secret_key', 500).nullable();
    t.string('stripe_webhook_secret', 500).nullable();
    t.boolean('payment_enabled').notNullable().defaultTo(false);
    t.jsonb('accepted_payment_methods').notNullable().defaultTo(JSON.stringify(['card']));
  });

  // ── Add Stripe columns to invoices ──
  await knex.schema.alterTable('invoices', (t) => {
    t.string('payment_url', 500).nullable();
    t.string('stripe_session_id', 255).nullable();
    t.string('stripe_payment_intent_id', 255).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('payment_url');
    t.dropColumn('stripe_session_id');
    t.dropColumn('stripe_payment_intent_id');
  });

  await knex.schema.alterTable('tenant_settings', (t) => {
    t.dropColumn('logo_base64');
    t.dropColumn('invoice_template');
    t.dropColumn('invoice_color_primary');
    t.dropColumn('invoice_color_secondary');
    t.dropColumn('invoice_footer_text');
    t.dropColumn('invoice_payment_terms');
    t.dropColumn('invoice_notes_default');
    t.dropColumn('show_logo_on_invoice');
    t.dropColumn('show_company_address');
    t.dropColumn('show_tax_id');
    t.dropColumn('stripe_publishable_key');
    t.dropColumn('stripe_secret_key');
    t.dropColumn('stripe_webhook_secret');
    t.dropColumn('payment_enabled');
    t.dropColumn('accepted_payment_methods');
  });
}
