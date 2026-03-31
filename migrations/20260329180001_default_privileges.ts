import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user
  `);

  await knex.raw(`
    ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_user
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
    REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM app_user
  `);

  await knex.raw(`
    ALTER DEFAULT PRIVILEGES FOR ROLE migration_user IN SCHEMA public
    REVOKE USAGE, SELECT ON SEQUENCES FROM app_user
  `);
}
