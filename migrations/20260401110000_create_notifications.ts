// Migration: Create notifications table for in-app notification system
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (t) => {
    t.bigIncrements('id').primary();
    t.bigInteger('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT');
    t.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('type', 20).notNullable().defaultTo('info'); // info, warning, error, success
    t.string('category', 50).notNullable();
    t.string('title', 255).notNullable();
    t.text('message').notNullable();
    t.string('link', 500).nullable();
    t.boolean('is_read').notNullable().defaultTo(false);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`ALTER TABLE notifications ADD CONSTRAINT notif_type_check CHECK (type IN ('info','warning','error','success'))`);
  await knex.raw(`CREATE INDEX notif_tenant_user_idx ON notifications (tenant_id, user_id, is_read)`);
  await knex.raw(`CREATE INDEX notif_tenant_created_idx ON notifications (tenant_id, created_at DESC)`);
  await knex.raw(`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`);
  await knex.raw(`CREATE POLICY notif_sel ON notifications FOR SELECT TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY notif_ins ON notifications FOR INSERT TO app_user WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY notif_upd ON notifications FOR UPDATE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY notif_del ON notifications FOR DELETE TO app_user USING (tenant_id::text = current_setting('app.current_tenant_id', true))`);
  await knex.raw(`CREATE POLICY notif_mig ON notifications FOR ALL TO migration_user USING (true) WITH CHECK (true)`);
  await knex.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO app_user`);
  await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO app_user`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
