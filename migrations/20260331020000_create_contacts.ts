// Migration: Create contacts table — unified customer/vendor directory
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('contacts', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.string('type', 20).notNullable().defaultTo('customer');
    t.string('company_name', 255).nullable();
    t.string('first_name', 100).notNullable();
    t.string('last_name', 100).nullable();
    t.string('email', 255).nullable();
    t.string('phone', 50).nullable();
    t.string('address_line1', 255).nullable();
    t.string('address_line2', 255).nullable();
    t.string('city', 100).nullable();
    t.string('state', 50).nullable();
    t.string('zip', 20).nullable();
    t.string('country', 10).notNullable().defaultTo('US');
    t.string('tax_id', 50).nullable();
    t.text('notes').nullable();
    t.string('status', 20).notNullable().defaultTo('active');
    t.bigInteger('default_revenue_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.bigInteger('default_expense_account_id').nullable().references('id').inTable('accounts').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.raw(`ALTER TABLE contacts ADD CONSTRAINT contacts_type_check CHECK (type IN ('customer','vendor','both'))`);
  await knex.raw(`ALTER TABLE contacts ADD CONSTRAINT contacts_status_check CHECK (status IN ('active','inactive'))`);
  await knex.raw(`CREATE INDEX contacts_tenant_type_idx ON contacts (tenant_id, type)`);
  await knex.raw(`CREATE INDEX contacts_tenant_status_idx ON contacts (tenant_id, status)`);

  await knex.raw(`ALTER TABLE contacts ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY contacts_tenant_select ON contacts FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY contacts_tenant_insert ON contacts FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY contacts_tenant_update ON contacts FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY contacts_tenant_delete ON contacts FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY contacts_migration_all ON contacts FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE contacts_id_seq TO app_user`);
  await knex.raw(`CREATE TRIGGER set_updated_at_contacts BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

  // Add contact_id FK to invoices and expenses
  await knex.schema.alterTable('invoices', (t) => {
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
  });
  await knex.schema.alterTable('expenses', (t) => {
    t.bigInteger('contact_id').nullable().references('id').inTable('contacts').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('expenses', (t) => { t.dropColumn('contact_id'); });
  await knex.schema.alterTable('invoices', (t) => { t.dropColumn('contact_id'); });
  await knex.schema.dropTableIfExists('contacts');
}
