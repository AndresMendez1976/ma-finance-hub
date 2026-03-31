// Migration: Create CRM module tables - pipelines, stages, opportunities, activities.
// Seed default Sales Pipeline with stages for tenant_id=1 if exists.
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── crm_pipelines ──
  await knex.schema.createTable('crm_pipelines', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.raw(`CREATE INDEX crm_pipelines_tenant_idx ON crm_pipelines (tenant_id)`);

  await knex.raw(`ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cp_tenant_sel ON crm_pipelines FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cp_tenant_ins ON crm_pipelines FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cp_tenant_upd ON crm_pipelines FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cp_tenant_del ON crm_pipelines FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cp_migration ON crm_pipelines FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON crm_pipelines TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE crm_pipelines_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_crm_pipelines BEFORE UPDATE ON crm_pipelines FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── crm_stages ──
  await knex.schema.createTable('crm_stages', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('pipeline_id').notNullable().references('id').inTable('crm_pipelines').onDelete('CASCADE');
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('name', 100).notNullable();
    t.integer('sort_order').notNullable();
    t.decimal('probability', 5, 2).notNullable().defaultTo(0);
    t.string('color', 7).notNullable();
    t.boolean('is_won').notNullable().defaultTo(false);
    t.boolean('is_lost').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  await knex.raw(`CREATE INDEX crm_stages_pipeline_idx ON crm_stages (pipeline_id)`);
  await knex.raw(`CREATE INDEX crm_stages_tenant_idx ON crm_stages (tenant_id)`);

  await knex.raw(`ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY cs_tenant_sel ON crm_stages FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cs_tenant_ins ON crm_stages FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cs_tenant_upd ON crm_stages FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cs_tenant_del ON crm_stages FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY cs_migration ON crm_stages FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON crm_stages TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE crm_stages_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_crm_stages BEFORE UPDATE ON crm_stages FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── crm_opportunities ──
  await knex.schema.createTable('crm_opportunities', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
    t.bigInteger('pipeline_id').notNullable().references('id').inTable('crm_pipelines').onDelete('RESTRICT');
    t.bigInteger('stage_id').notNullable().references('id').inTable('crm_stages').onDelete('RESTRICT');
    t.string('title', 255).notNullable();
    t.decimal('value', 12, 2).notNullable().defaultTo(0);
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.date('expected_close_date').nullable();
    t.date('actual_close_date').nullable();
    t.decimal('probability', 5, 2).notNullable().defaultTo(0);
    t.decimal('weighted_value', 12, 2).notNullable().defaultTo(0);
    t.string('source', 100).nullable();
    t.text('notes').nullable();
    t.string('assigned_to', 255).nullable();
    t.string('status', 20).notNullable().defaultTo('open');
    t.bigInteger('invoice_id').nullable().references('id').inTable('invoices').onDelete('SET NULL');
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.raw(`
    ALTER TABLE crm_opportunities ADD CONSTRAINT co_status_check
    CHECK (status IN ('open', 'won', 'lost'))
  `);

  await knex.raw(`CREATE INDEX crm_opportunities_tenant_idx ON crm_opportunities (tenant_id)`);
  await knex.raw(`CREATE INDEX crm_opportunities_pipeline_idx ON crm_opportunities (pipeline_id)`);
  await knex.raw(`CREATE INDEX crm_opportunities_stage_idx ON crm_opportunities (stage_id)`);
  await knex.raw(`CREATE INDEX crm_opportunities_contact_idx ON crm_opportunities (contact_id)`);
  await knex.raw(`CREATE INDEX crm_opportunities_tenant_status_idx ON crm_opportunities (tenant_id, status)`);

  await knex.raw(`ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY co_tenant_sel ON crm_opportunities FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_tenant_ins ON crm_opportunities FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_tenant_upd ON crm_opportunities FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_tenant_del ON crm_opportunities FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY co_migration ON crm_opportunities FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON crm_opportunities TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE crm_opportunities_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_crm_opportunities BEFORE UPDATE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // ── crm_activities ──
  await knex.schema.createTable('crm_activities', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('opportunity_id').notNullable().references('id').inTable('crm_opportunities').onDelete('CASCADE');
    t.string('type', 20).notNullable();
    t.string('title', 255).notNullable();
    t.text('description').nullable();
    t.timestamp('date').notNullable();
    t.boolean('completed').notNullable().defaultTo(false);
    t.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE crm_activities ADD CONSTRAINT ca_type_check
    CHECK (type IN ('note', 'call', 'email', 'meeting', 'task'))
  `);

  await knex.raw(`CREATE INDEX crm_activities_tenant_idx ON crm_activities (tenant_id)`);
  await knex.raw(`CREATE INDEX crm_activities_opportunity_idx ON crm_activities (opportunity_id)`);

  await knex.raw(`ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY ca_tenant_sel ON crm_activities FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ca_tenant_ins ON crm_activities FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ca_tenant_upd ON crm_activities FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ca_tenant_del ON crm_activities FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY ca_migration ON crm_activities FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON crm_activities TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE crm_activities_id_seq TO app_user`);

  // ── Seed default pipeline and stages for tenant_id=1 ──
  await knex.raw(`
    DO $$
    DECLARE
      v_tenant_id bigint;
      v_pipeline_id bigint;
    BEGIN
      SELECT id INTO v_tenant_id FROM tenants WHERE id = 1;
      IF v_tenant_id IS NOT NULL THEN
        INSERT INTO crm_pipelines (tenant_id, name, is_default)
        VALUES (v_tenant_id, 'Sales Pipeline', true)
        RETURNING id INTO v_pipeline_id;

        INSERT INTO crm_stages (pipeline_id, tenant_id, name, sort_order, probability, color, is_won, is_lost) VALUES
          (v_pipeline_id, v_tenant_id, 'Lead',        1,  10.00, '#B4D4E7', false, false),
          (v_pipeline_id, v_tenant_id, 'Qualified',    2,  25.00, '#D4A854', false, false),
          (v_pipeline_id, v_tenant_id, 'Proposal',     3,  50.00, '#D4A854', false, false),
          (v_pipeline_id, v_tenant_id, 'Negotiation',  4,  75.00, '#40916C', false, false),
          (v_pipeline_id, v_tenant_id, 'Closed Won',   5, 100.00, '#2D6A4F', true,  false),
          (v_pipeline_id, v_tenant_id, 'Closed Lost',  6,   0.00, '#E07A5F', false, true);
      END IF;
    END
    $$
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('crm_activities');
  await knex.schema.dropTableIfExists('crm_opportunities');
  await knex.schema.dropTableIfExists('crm_stages');
  await knex.schema.dropTableIfExists('crm_pipelines');
}
