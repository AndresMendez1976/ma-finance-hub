import { Module, OnApplicationShutdown, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';

export const KNEX_CONNECTION = 'KNEX_CONNECTION';

@Module({
  providers: [
    {
      provide: KNEX_CONNECTION,
      useFactory: (config: ConfigService): Knex => {
        return knex({
          client: 'pg',
          connection: {
            host: config.get<string>('DB_HOST'),
            port: config.get<number>('DB_PORT'),
            database: config.get<string>('DB_NAME'),
            user: config.get<string>('DB_USER'),
            password: config.get<string>('DB_PASSWORD'),
            ssl:
              config.get<string>('DB_SSL') === 'true'
                ? { rejectUnauthorized: false }
                : false,
          },
          pool: { min: 2, max: 30 },
          acquireConnectionTimeout: 10000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [KNEX_CONNECTION],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(KNEX_CONNECTION) private readonly db: Knex) {}

  async onApplicationShutdown() {
    try {
      await this.db.destroy();
      this.logger.log('Knex pool destroyed');
    } catch {
      this.logger.warn('Knex pool already destroyed');
    }
  }
}
