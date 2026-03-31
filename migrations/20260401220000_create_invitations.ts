// Migration: Create invitations table and add user_type/external columns to users
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add user type columns to users table
  await knex.schema.alterTable('users', (t) => {
    t.string('user_type', 20).notNullable().defaultTo('internal');
    t.string('external_type', 20).nullable();
    t.bigInteger('invited_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.boolean('can_export_data').notNullable().defaultTo(false);
    t.timestamp('access_expires_at').nullable();
    t.timestamp('last_activity_at').nullable();
  });

  // Invitations table
  await knex.schema.createTable('invitations', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('email', 255).notNullable();
    t.string('role', 20).notNullable();
    t.string('user_type', 20).notNullable().defaultTo('internal');
    t.string('external_type', 20).nullable();
    t.jsonb('permissions').nullable();
    t.bigInteger('invited_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('token', 255).notNullable().unique();
    t.string('status', 20).notNullable().defaultTo('pending');
    t.timestamp('expires_at').notNullable();
    t.timestamp('accepted_at').nullable();
    t.bigInteger('accepted_by_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('message').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE invitations ADD CONSTRAINT inv_status_check CHECK (status IN ('pending','accepted','expired','revoked'))`);
  await knex.raw(`ALTER TABLE invitations ADD CONSTRAINT inv_utype_check CHECK (user_type IN ('internal','external'))`);
  await knex.raw(`CREATE INDEX inv_token_idx ON invitations (token)`);
  await knex.raw(`CREATE INDEX inv_tenant_idx ON invitations (tenant_id)`);
  await knex.raw(`ALTER TABLE invitations ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY inv_sel ON invitations FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_ins ON invitations FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_upd ON invitations FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY inv_mig ON invitations FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE ON invitations TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE invitations_id_seq TO app_user`);

  // External access log
  await knex.schema.createTable('external_access_log', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('action', 100).notNullable();
    t.string('entity_type', 50).nullable();
    t.bigInteger('entity_id').nullable();
    t.string('ip_address', 45).nullable();
    t.string('user_agent', 500).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`CREATE INDEX eal_user_idx ON external_access_log (user_id, tenant_id)`);
  await knex.raw(`ALTER TABLE external_access_log ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY eal_sel ON external_access_log FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eal_ins ON external_access_log FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY eal_mig ON external_access_log FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT ON external_access_log TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE external_access_log_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('external_access_log');
  await knex.schema.dropTableIfExists('invitations');
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('user_type');
    t.dropColumn('external_type');
    t.dropColumn('invited_by');
    t.dropColumn('can_export_data');
    t.dropColumn('access_expires_at');
    t.dropColumn('last_activity_at');
  });
}
