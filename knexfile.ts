import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, envFile) });

// Migrations run as migration_user (schema management privileges)
const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ma_finance_hub',
    user: process.env.DB_MIGRATION_USER || 'migration_user',
    password: process.env.DB_MIGRATION_PASSWORD || 'migration_password_dev',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.resolve(__dirname, 'seeds'),
    extension: 'ts',
  },
};

export default config;
