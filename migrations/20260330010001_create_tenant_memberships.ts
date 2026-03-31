import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tenant_memberships', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table
      .bigInteger('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.string('role', 50).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'user_id']);
    table.index(['user_id']);
  });

  await knex.raw(`
    ALTER TABLE tenant_memberships
    ADD CONSTRAINT chk_role CHECK (role IN ('owner', 'admin', 'manager', 'analyst', 'viewer'))
  `);

  await knex.raw(`
    CREATE TRIGGER trg_tenant_memberships_updated_at
    BEFORE UPDATE ON tenant_memberships
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_tenant_memberships_updated_at ON tenant_memberships');
  await knex.schema.dropTableIfExists('tenant_memberships');
}
