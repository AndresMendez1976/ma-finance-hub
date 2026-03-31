import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheStore, InMemoryCacheStore } from './cache';
import { RedisCacheStore } from './redis-cache';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const CACHE_STORE = 'CACHE_STORE';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService): Redis | null => {
        const logger = new Logger('RedisModule');
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) {
          logger.warn('REDIS_URL not set — using in-memory cache (single-instance only)');
          return null;
        }
        const client = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 200, 5000),
          enableReadyCheck: true,
        });
        client.on('error', (err) => logger.error(`Redis error: ${String(err)}`));
        client.on('connect', () => logger.log('Redis connected'));
        return client;
      },
      inject: [ConfigService],
    },
    {
      provide: CACHE_STORE,
      useFactory: (redis: Redis | null): CacheStore<unknown> => {
        if (redis) return new RedisCacheStore(redis, 'mfh:entitlements:');
        return new InMemoryCacheStore(1000);
      },
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [REDIS_CLIENT, CACHE_STORE],
})
export class RedisModule {}
