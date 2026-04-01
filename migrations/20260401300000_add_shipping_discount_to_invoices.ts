// Migration: Add shipping_amount and discount fields to invoices, purchase_orders, and estimates
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── invoices ──
  await knex.schema.alterTable('invoices', (t) => {
    t.decimal('shipping_amount', 12, 2).notNullable().defaultTo(0);
    t.string('discount_type', 20).notNullable().defaultTo('none');
    t.decimal('discount_value', 12, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
  });

  // ── purchase_orders ──
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.string('discount_type', 20).notNullable().defaultTo('none');
    t.decimal('discount_value', 12, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
  });

  // ── estimates ──
  await knex.schema.alterTable('estimates', (t) => {
    t.decimal('shipping_amount', 12, 2).notNullable().defaultTo(0);
    t.string('discount_type', 20).notNullable().defaultTo('none');
    t.decimal('discount_value', 12, 2).notNullable().defaultTo(0);
    t.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('estimates', (t) => {
    t.dropColumn('shipping_amount');
    t.dropColumn('discount_type');
    t.dropColumn('discount_value');
    t.dropColumn('discount_amount');
  });

  await knex.schema.alterTable('purchase_orders', (t) => {
    t.dropColumn('discount_type');
    t.dropColumn('discount_value');
    t.dropColumn('discount_amount');
  });

  await knex.schema.alterTable('invoices', (t) => {
    t.dropColumn('shipping_amount');
    t.dropColumn('discount_type');
    t.dropColumn('discount_value');
    t.dropColumn('discount_amount');
  });
}
