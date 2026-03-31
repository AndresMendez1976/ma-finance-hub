import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed throttler storage for multi-instance deployments.
 * Falls back gracefully if Redis is unavailable (allows request through).
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async increment(key: string, ttl: number, _limit: number, _blockDuration: number, _throttlerName: string): Promise<ThrottlerStorageRecord> {
    if (!this.redis) {
      // No Redis = single instance, use default behavior (pass through)
      return { totalHits: 1, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }

    try {
      const redisKey = `throttle:${key}`;
      const hits = await this.redis.incr(redisKey);
      if (hits === 1) {
        await this.redis.pexpire(redisKey, ttl);
      }
      const pttl = await this.redis.pttl(redisKey);
      return {
        totalHits: hits,
        timeToExpire: Math.max(pttl, 0),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch {
      // Redis failure = allow request (fail open for rate limiting only)
      return { totalHits: 1, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }
  }

  async onModuleDestroy() {
    // Redis client lifecycle managed by RedisModule
  }
}
