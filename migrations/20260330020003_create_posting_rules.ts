import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── posting_rules ──
  await knex.schema.createTable('posting_rules', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('event_type', 100).notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'event_type', 'name']);
    table.index(['tenant_id', 'event_type']);
  });

  await knex.raw(`CREATE TRIGGER trg_posting_rules_updated_at BEFORE UPDATE ON posting_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  await knex.raw('ALTER TABLE posting_rules ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON posting_rules FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_insert ON posting_rules FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_update ON posting_rules FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_delete ON posting_rules FOR DELETE TO app_user USING (tenant_id = app_current_tenant_id())`);

  // ── posting_rule_lines ──
  await knex.schema.createTable('posting_rule_lines', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('posting_rule_id').notNullable().references('id').inTable('posting_rules').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('entry_type', 10).notNullable();
    table.string('amount_source', 255).notNullable();
    table.integer('line_order').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['posting_rule_id']);
  });

  await knex.raw(`ALTER TABLE posting_rule_lines ADD CONSTRAINT chk_entry_type CHECK (entry_type IN ('debit', 'credit'))`);
  await knex.raw(`CREATE TRIGGER trg_posting_rule_lines_updated_at BEFORE UPDATE ON posting_rule_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  await knex.raw('ALTER TABLE posting_rule_lines ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON posting_rule_lines FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_insert ON posting_rule_lines FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_update ON posting_rule_lines FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_delete ON posting_rule_lines FOR DELETE TO app_user USING (tenant_id = app_current_tenant_id())`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON posting_rule_lines');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON posting_rule_lines');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON posting_rule_lines');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON posting_rule_lines');
  await knex.raw('DROP TRIGGER IF EXISTS trg_posting_rule_lines_updated_at ON posting_rule_lines');
  await knex.schema.dropTableIfExists('posting_rule_lines');

  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON posting_rules');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON posting_rules');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON posting_rules');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON posting_rules');
  await knex.raw('DROP TRIGGER IF EXISTS trg_posting_rules_updated_at ON posting_rules');
  await knex.schema.dropTableIfExists('posting_rules');
}
