import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── journal_entries ──
  await knex.schema.createTable('journal_entries', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('fiscal_period_id').notNullable().references('id').inTable('fiscal_periods').onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('reference', 100).nullable();
    table.text('memo').nullable();
    table.string('status', 20).notNullable().defaultTo('draft');
    table.timestamp('posted_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['tenant_id', 'fiscal_period_id']);
    table.index(['tenant_id', 'status']);
  });

  await knex.raw(`ALTER TABLE journal_entries ADD CONSTRAINT chk_je_status CHECK (status IN ('draft', 'posted', 'voided'))`);
  await knex.raw(`CREATE TRIGGER trg_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  await knex.raw('ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON journal_entries FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_insert ON journal_entries FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_update ON journal_entries FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_delete ON journal_entries FOR DELETE TO app_user USING (tenant_id = app_current_tenant_id())`);

  // ── journal_lines ──
  await knex.schema.createTable('journal_lines', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('journal_entry_id').notNullable().references('id').inTable('journal_entries').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('account_id').notNullable().references('id').inTable('accounts').onDelete('RESTRICT').onUpdate('CASCADE');
    table.decimal('debit', 18, 4).notNullable().defaultTo(0);
    table.decimal('credit', 18, 4).notNullable().defaultTo(0);
    table.text('description').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['journal_entry_id']);
    table.index(['tenant_id', 'account_id']);
  });

  // A line must have debit > 0 OR credit > 0, but not both
  await knex.raw(`
    ALTER TABLE journal_lines ADD CONSTRAINT chk_debit_or_credit CHECK (
      (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
  `);

  await knex.raw(`CREATE TRIGGER trg_journal_lines_updated_at BEFORE UPDATE ON journal_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  await knex.raw('ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON journal_lines FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_insert ON journal_lines FOR INSERT TO app_user WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_update ON journal_lines FOR UPDATE TO app_user USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())`);
  await knex.raw(`CREATE POLICY tenant_isolation_delete ON journal_lines FOR DELETE TO app_user USING (tenant_id = app_current_tenant_id())`);
}

export async function down(knex: Knex): Promise<void> {
  // journal_lines
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON journal_lines');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON journal_lines');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON journal_lines');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON journal_lines');
  await knex.raw('DROP TRIGGER IF EXISTS trg_journal_lines_updated_at ON journal_lines');
  await knex.schema.dropTableIfExists('journal_lines');

  // journal_entries
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_delete ON journal_entries');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_update ON journal_entries');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_insert ON journal_entries');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON journal_entries');
  await knex.raw('DROP TRIGGER IF EXISTS trg_journal_entries_updated_at ON journal_entries');
  await knex.schema.dropTableIfExists('journal_entries');
}
