import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('fiscal_periods', (table) => {
    table.bigIncrements('id').primary();
    table
      .bigInteger('tenant_id')
      .notNullable()
      .references('id')
      .inTable('tenants')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
    table.integer('fiscal_year').notNullable();
    table.integer('fiscal_month').notNullable();
    table.string('status', 20).notNullable();
    table.timestamp('opened_at', { useTz: true }).nullable();
    table.timestamp('closed_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['tenant_id', 'fiscal_year', 'fiscal_month']);
    table.index(['tenant_id', 'status']);
  });

  await knex.raw(`
    ALTER TABLE fiscal_periods
    ADD CONSTRAINT chk_fiscal_month CHECK (fiscal_month BETWEEN 1 AND 12)
  `);

  await knex.raw(`
    ALTER TABLE fiscal_periods
    ADD CONSTRAINT chk_status CHECK (status IN ('open', 'closed'))
  `);

  await knex.raw(`
    CREATE TRIGGER trg_fiscal_periods_updated_at
    BEFORE UPDATE ON fiscal_periods
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at()
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_fiscal_periods_updated_at ON fiscal_periods');
  await knex.schema.dropTableIfExists('fiscal_periods');
}
