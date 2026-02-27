import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponseCache, createCacheKey } from '../../utils/response-cache.js';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(() => {
    cache = new ResponseCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    cache.set('key1', { data: 'test' }, 60);
    expect(cache.get('key1')).toEqual({ data: 'test' });
  });

  it('returns null for missing keys', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('expires entries after TTL', () => {
    cache.set('key1', 'value', 10);

    vi.advanceTimersByTime(5000);
    expect(cache.get('key1')).toBe('value');

    vi.advanceTimersByTime(6000);
    expect(cache.get('key1')).toBeNull();
  });

  it('deletes specific entries', () => {
    cache.set('key1', 'value1', 60);
    cache.set('key2', 'value2', 60);

    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
  });

  it('clears all entries', () => {
    cache.set('key1', 'value1', 60);
    cache.set('key2', 'value2', 60);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('reports correct size', () => {
    expect(cache.size).toBe(0);
    cache.set('key1', 'value', 60);
    expect(cache.size).toBe(1);
  });
});

describe('createCacheKey', () => {
  it('creates key from url and method', () => {
    expect(createCacheKey('https://test.com', 'GET')).toBe('GET:https://test.com');
  });

  it('includes params in key when provided', () => {
    const key = createCacheKey('https://test.com', 'POST', { q: 'SELECT 1' });
    expect(key).toContain('POST:https://test.com:');
    expect(key).toContain('"q":"SELECT 1"');
  });
});
