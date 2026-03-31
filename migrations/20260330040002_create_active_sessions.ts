import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('active_sessions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('jti', 255).notNullable();
    table.timestamp('issued_at', { useTz: true }).notNullable();
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('last_seen_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'jti']);
    table.index(['tenant_id', 'user_id']);
    table.index(['expires_at']);
  });

  // RLS: tenant-scoped
  await knex.raw('ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON active_sessions FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_insert ON active_sessions FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_update ON active_sessions FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON active_sessions');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON active_sessions');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON active_sessions');
  await knex.schema.dropTableIfExists('active_sessions');
}
