// Migration: Create client_portal_tokens for public client portal access
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('client_portal_tokens', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE');
    t.string('token', 255).notNullable().unique();
    t.timestamp('expires_at').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`CREATE INDEX cpt_token_idx ON client_portal_tokens (token)`);
  await knex.raw(`ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cpt_sel ON client_portal_tokens FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cpt_ins ON client_portal_tokens FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cpt_upd ON client_portal_tokens FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cpt_mig ON client_portal_tokens FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE ON client_portal_tokens TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE client_portal_tokens_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client_portal_tokens');
}
