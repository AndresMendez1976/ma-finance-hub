import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('audit_log', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').nullable();
    table.string('actor_subject', 255).notNullable();
    table.string('action', 100).notNullable();
    table.string('entity', 100).notNullable();
    table.string('entity_id', 100).nullable();
    table.jsonb('metadata').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['tenant_id', 'entity', 'entity_id']);
    table.index(['tenant_id', 'created_at']);
    table.index(['actor_subject']);
  });

  // Append-only: deny UPDATE and DELETE for app_user at DB level
  await knex.raw('ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY');

  // SELECT: app_user can read audit entries for current tenant
  await knex.raw(`
    CREATE POLICY audit_log_select ON audit_log
      FOR SELECT TO app_user
      USING (tenant_id = app_current_tenant_id() OR tenant_id IS NULL)
  `);

  // INSERT: app_user can insert for current tenant
  await knex.raw(`
    CREATE POLICY audit_log_insert ON audit_log
      FOR INSERT TO app_user
      WITH CHECK (tenant_id = app_current_tenant_id() OR tenant_id IS NULL)
  `);

  // No UPDATE or DELETE policies — append-only by design.
  // migration_user (table owner) is exempt from RLS and can query all for admin/compliance.

  // Additional safety: create a trigger that prevents UPDATE on audit_log
  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: % operations are not allowed', TG_OP;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation()
  `);

  await knex.raw(`
    CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON audit_log');
  await knex.raw('DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log');
  await knex.raw('DROP FUNCTION IF EXISTS prevent_audit_log_mutation()');
  await knex.raw('DROP POLICY IF EXISTS audit_log_insert ON audit_log');
  await knex.raw('DROP POLICY IF EXISTS audit_log_select ON audit_log');
  await knex.schema.dropTableIfExists('audit_log');
}
