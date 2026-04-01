// Migration: Create document_templates table for customizable document layouts
// Supports Invoice, Estimate, PO, Credit Note templates with full RLS
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_templates', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('document_type', 30).notNullable(); // invoice, estimate, purchase_order, credit_note
    t.string('name', 255).notNullable().defaultTo('Default');
    t.string('layout', 20).notNullable().defaultTo('classic'); // classic, modern, minimal
    t.string('primary_color', 7).notNullable().defaultTo('#2D6A4F');
    t.string('secondary_color', 7).notNullable().defaultTo('#E8DCC8');
    t.string('font', 20).notNullable().defaultTo('helvetica');
    t.boolean('show_logo').notNullable().defaultTo(true);
    t.boolean('show_company_address').notNullable().defaultTo(true);
    t.boolean('show_company_phone').notNullable().defaultTo(true);
    t.boolean('show_company_email').notNullable().defaultTo(true);
    t.boolean('show_tax_id').notNullable().defaultTo(false);
    t.text('header_text').nullable();
    t.text('footer_text').nullable();
    t.text('terms_text').nullable();
    t.text('notes_text').nullable();
    t.boolean('show_payment_link').notNullable().defaultTo(true);
    t.boolean('show_due_date').notNullable().defaultTo(true);
    t.boolean('show_po_number').notNullable().defaultTo(true);
    t.string('paper_size', 10).notNullable().defaultTo('letter');
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });

  // Constraints
  await knex.raw(`
    ALTER TABLE document_templates ADD CONSTRAINT document_templates_type_check
    CHECK (document_type IN ('invoice', 'estimate', 'purchase_order', 'credit_note'))
  `);
  await knex.raw(`
    ALTER TABLE document_templates ADD CONSTRAINT document_templates_layout_check
    CHECK (layout IN ('classic', 'modern', 'minimal'))
  `);
  await knex.raw(`
    ALTER TABLE document_templates ADD CONSTRAINT document_templates_paper_check
    CHECK (paper_size IN ('letter', 'a4'))
  `);

  // Indexes
  await knex.raw(`CREATE INDEX document_templates_tenant_type_idx ON document_templates (tenant_id, document_type)`);
  await knex.raw(`CREATE INDEX document_templates_tenant_default_idx ON document_templates (tenant_id, document_type, is_default)`);

  // ── RLS ──
  await knex.raw(`ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY`);

  await knex.raw(`
    CREATE POLICY document_templates_tenant_select ON document_templates FOR SELECT TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY document_templates_tenant_insert ON document_templates FOR INSERT TO app_user
    WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY document_templates_tenant_update ON document_templates FOR UPDATE TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);
  await knex.raw(`
    CREATE POLICY document_templates_tenant_delete ON document_templates FOR DELETE TO app_user
    USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  `);

  // Migration user bypass
  await knex.raw(`CREATE POLICY document_templates_migration_all ON document_templates FOR ALL TO migration_user USING (true) WITH CHECK (true)`);

  // Grants
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON document_templates TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE document_templates_id_seq TO app_user`);

  // Updated_at trigger
  await knex.raw(`CREATE TRIGGER set_updated_at_document_templates BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_templates');
}
