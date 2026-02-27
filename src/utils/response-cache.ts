interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple in-memory TTL-based cache for API responses.
 */
export class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /** Get a cached value, or null if not found or expired. */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /** Set a cached value with a TTL in seconds. */
  set(key: string, data: unknown, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /** Delete a specific cache entry. */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Clear all cached entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Get the number of entries (including expired). */
  get size(): number {
    return this.cache.size;
  }
}

/** Create a cache key from request parameters. */
export function createCacheKey(
  url: string,
  method: string,
  params?: unknown,
): string {
  const base = `${method}:${url}`;
  if (params) {
    return `${base}:${JSON.stringify(params)}`;
  }
  return base;
}
