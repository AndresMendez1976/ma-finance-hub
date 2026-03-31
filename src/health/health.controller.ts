import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { Knex } from 'knex';
import Redis from 'ioredis';
import { KNEX_CONNECTION } from '../database';
import { REDIS_CLIENT } from '../common/redis.module';

@Controller()
export class HealthController {
  constructor(
    @Inject(KNEX_CONNECTION) private readonly db: Knex,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};

    try {
      const result = await this.db.raw<{ rows: { now: string }[] }>('SELECT now()');
      checks.db = 'connected';
      checks.timestamp = result.rows[0].now;
    } catch {
      checks.db = 'error';
    }

    if (this.redis) {
      try {
        await this.redis.ping();
        checks.redis = 'connected';
      } catch {
        checks.redis = 'error';
      }
    }

    const allOk = Object.values(checks).every((v) => v !== 'error');
    return { status: allOk ? 'ok' : 'degraded', ...checks };
  }
}
