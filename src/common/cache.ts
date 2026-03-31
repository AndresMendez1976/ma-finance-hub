/**
 * Async cache interface. Supports both in-memory and Redis backends.
 */
export interface CacheStore<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryCacheStore<T> implements CacheStore<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  get(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return Promise.resolve(null);
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  set(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.store.size > this.maxEntries) {
      let oldest: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.store) {
        if (v.expiresAt < oldestTime) { oldest = k; oldestTime = v.expiresAt; }
      }
      if (oldest) this.store.delete(oldest);
    }
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
