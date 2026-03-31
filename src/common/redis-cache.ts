import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { CacheStore } from './cache';

/**
 * Redis-backed cache store. Serializes values as JSON.
 * Falls back to returning null on errors (fail-closed for entitlements —
 * no cache = query DB = deny if no tier found).
 */
export class RedisCacheStore<T> implements CacheStore<T> {
  private readonly logger = new Logger(RedisCacheStore.name);
  private readonly prefix: string;

  constructor(
    private readonly redis: Redis,
    prefix = 'cache:',
  ) {
    this.prefix = prefix;
  }

  async get(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.prefix + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Redis cache get failed for ${key}: ${String(err)}`);
      return null;
    }
  }

  async set(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await this.redis.set(this.prefix + key, JSON.stringify(value), 'PX', ttlMs);
    } catch (err) {
      this.logger.warn(`Redis cache set failed for ${key}: ${String(err)}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefix + key);
    } catch (err) {
      this.logger.warn(`Redis cache delete failed for ${key}: ${String(err)}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      if (keys.length > 0) await this.redis.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis cache clear failed: ${String(err)}`);
    }
  }
}
