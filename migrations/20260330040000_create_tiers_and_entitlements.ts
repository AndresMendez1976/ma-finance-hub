import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── tiers ──
  await knex.schema.createTable('tiers', (table) => {
    table.bigIncrements('id').primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw('CREATE TRIGGER trg_tiers_updated_at BEFORE UPDATE ON tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

  // ── entitlement_definitions ──
  await knex.schema.createTable('entitlement_definitions', (table) => {
    table.bigIncrements('id').primary();
    table.string('key', 100).notNullable().unique();
    table.string('type', 20).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE entitlement_definitions ADD CONSTRAINT chk_entitlement_type CHECK (type IN ('boolean', 'limit'))`);
  await knex.raw('CREATE TRIGGER trg_entitlement_definitions_updated_at BEFORE UPDATE ON entitlement_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

  // ── tier_entitlements ──
  await knex.schema.createTable('tier_entitlements', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tier_id').notNullable().references('id').inTable('tiers').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('entitlement_definition_id').notNullable().references('id').inTable('entitlement_definitions').onDelete('CASCADE').onUpdate('CASCADE');
    table.boolean('enabled').nullable();
    table.integer('limit_value').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['tier_id', 'entitlement_definition_id']);
  });
  await knex.raw('CREATE TRIGGER trg_tier_entitlements_updated_at BEFORE UPDATE ON tier_entitlements FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

  // ── tenant_tiers ──
  await knex.schema.createTable('tenant_tiers', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('tier_id').notNullable().references('id').inTable('tiers').onDelete('RESTRICT').onUpdate('CASCADE');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('starts_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('ends_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['tenant_id']);
  });
  await knex.raw('CREATE TRIGGER trg_tenant_tiers_updated_at BEFORE UPDATE ON tenant_tiers FOR EACH ROW EXECUTE FUNCTION set_updated_at()');

  // RLS on tenant_tiers — tenant-scoped
  await knex.raw('ALTER TABLE tenant_tiers ENABLE ROW LEVEL SECURITY');
  await knex.raw(`CREATE POLICY tenant_isolation_select ON tenant_tiers FOR SELECT TO app_user USING (tenant_id = app_current_tenant_id())`);

  // tiers, entitlement_definitions, tier_entitlements are catalog tables — readable by all authenticated users
  for (const table of ['tiers', 'entitlement_definitions', 'tier_entitlements']) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`CREATE POLICY catalog_select ON ${table} FOR SELECT TO app_user USING (true)`);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of ['tier_entitlements', 'entitlement_definitions', 'tiers']) {
    await knex.raw(`DROP POLICY IF EXISTS catalog_select ON ${table}`);
  }
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_select ON tenant_tiers');

  await knex.raw('DROP TRIGGER IF EXISTS trg_tenant_tiers_updated_at ON tenant_tiers');
  await knex.schema.dropTableIfExists('tenant_tiers');
  await knex.raw('DROP TRIGGER IF EXISTS trg_tier_entitlements_updated_at ON tier_entitlements');
  await knex.schema.dropTableIfExists('tier_entitlements');
  await knex.raw('DROP TRIGGER IF EXISTS trg_entitlement_definitions_updated_at ON entitlement_definitions');
  await knex.schema.dropTableIfExists('entitlement_definitions');
  await knex.raw('DROP TRIGGER IF EXISTS trg_tiers_updated_at ON tiers');
  await knex.schema.dropTableIfExists('tiers');
}
