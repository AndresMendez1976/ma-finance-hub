// Migration: Add MFA (TOTP) columns to users table and MFA settings to tenant_settings
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add MFA columns to users
  await knex.schema.alterTable('users', (t) => {
    t.boolean('mfa_enabled').notNullable().defaultTo(false);
    t.string('mfa_secret', 500).nullable(); // AES-256 encrypted TOTP secret
    t.jsonb('mfa_backup_codes').nullable(); // array of bcrypt-hashed backup codes
    t.timestamp('mfa_verified_at').nullable();
    t.integer('failed_login_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until').nullable();
  });

  // Add MFA enforcement settings to tenant_settings
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.jsonb('mfa_required_for_roles').notNullable().defaultTo('["owner","admin"]');
    t.integer('mfa_grace_period_days').notNullable().defaultTo(7);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenant_settings', (t) => {
    t.dropColumn('mfa_required_for_roles');
    t.dropColumn('mfa_grace_period_days');
  });
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('mfa_enabled');
    t.dropColumn('mfa_secret');
    t.dropColumn('mfa_backup_codes');
    t.dropColumn('mfa_verified_at');
    t.dropColumn('failed_login_attempts');
    t.dropColumn('locked_until');
  });
}
