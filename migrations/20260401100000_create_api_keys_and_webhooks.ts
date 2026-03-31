// Migration: Create api_keys and webhooks tables for public API support
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── api_keys ──
  await knex.schema.createTable('api_keys', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('key_hash', 255).notNullable();
    t.string('name', 100).notNullable();
    t.jsonb('permissions').notNullable().defaultTo('[]');
    t.timestamp('last_used_at').nullable();
    t.timestamp('expires_at').nullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY api_keys_sel ON api_keys FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY api_keys_ins ON api_keys FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY api_keys_upd ON api_keys FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY api_keys_del ON api_keys FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY api_keys_mig ON api_keys FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE api_keys_id_seq TO app_user`);

  // ── webhooks ──
  await knex.schema.createTable('webhooks', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('url', 500).notNullable();
    t.jsonb('events').notNullable().defaultTo('[]');
    t.string('secret', 255).notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY webhooks_sel ON webhooks FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY webhooks_ins ON webhooks FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY webhooks_upd ON webhooks FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY webhooks_del ON webhooks FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY webhooks_mig ON webhooks FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON webhooks TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE webhooks_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_webhooks BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhooks');
  await knex.schema.dropTableIfExists('api_keys');
}
