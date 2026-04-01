// Migration: Create company_groups and company_group_members for cross-tenant company grouping
// NO RLS on company_groups (cross-tenant by design). Members linked via tenant_id FK.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── company_groups (NO tenant_id, cross-tenant) ──
  await knex.schema.createTable('company_groups', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('owner_user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON company_groups TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE company_groups_id_seq TO app_user`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON company_groups TO migration_user`);

  // ── company_group_members ──
  await knex.schema.createTable('company_group_members', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('group_id').notNullable().references('id').inTable('company_groups').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.timestamp('added_at').defaultTo(knex.fn.now());
  });
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON company_group_members TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE company_group_members_id_seq TO app_user`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON company_group_members TO migration_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('company_group_members');
  await knex.schema.dropTableIfExists('company_groups');
}
