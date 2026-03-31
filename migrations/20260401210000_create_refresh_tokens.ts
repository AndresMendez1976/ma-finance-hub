// Migration: Create refresh_tokens table for JWT refresh token rotation
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('token_hash', 255).notNullable();
    t.timestamp('expires_at').notNullable();
    t.boolean('revoked').notNullable().defaultTo(false);
    t.timestamp('revoked_at').nullable();
    t.string('ip_address', 45).nullable();
    t.string('user_agent', 500).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`CREATE INDEX rt_token_hash_idx ON refresh_tokens (token_hash)`);
  await knex.raw(`CREATE INDEX rt_user_tenant_idx ON refresh_tokens (user_id, tenant_id)`);
  await knex.raw(`ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY rt_sel ON refresh_tokens FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY rt_ins ON refresh_tokens FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY rt_upd ON refresh_tokens FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY rt_mig ON refresh_tokens FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE ON refresh_tokens TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE refresh_tokens_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
