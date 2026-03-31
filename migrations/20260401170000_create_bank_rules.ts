// Migration: Create bank_rules for auto-categorization of bank transactions
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('bank_rules', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 255).notNullable();
    t.integer('priority').notNullable().defaultTo(100);
    t.jsonb('conditions').notNullable().defaultTo('[]');
    t.bigInteger('action_account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT');
    t.bigInteger('action_contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.string('action_category', 100).nullable();
    t.string('action_memo', 500).nullable();
    t.boolean('auto_approve').notNullable().defaultTo(false);
    t.boolean('is_active').notNullable().defaultTo(true);
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
  await knex.raw(`ALTER TABLE bank_rules ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY br_sel ON bank_rules FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY br_ins ON bank_rules FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY br_upd ON bank_rules FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY br_del ON bank_rules FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY br_mig ON bank_rules FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_rules TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE bank_rules_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_br BEFORE UPDATE ON bank_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bank_rules');
}
