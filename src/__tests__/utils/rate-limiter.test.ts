import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../utils/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = new RateLimiter(3, 60_000);

    expect(limiter.canMakeRequest()).toBe(true);
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(true);
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(true);
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('reports remaining requests', () => {
    const limiter = new RateLimiter(5, 60_000);

    expect(limiter.getRemainingRequests()).toBe(5);
    limiter.recordRequest();
    expect(limiter.getRemainingRequests()).toBe(4);
  });

  it('resets after the time window passes', () => {
    const limiter = new RateLimiter(2, 1000);

    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);

    vi.advanceTimersByTime(1100);
    expect(limiter.canMakeRequest()).toBe(true);
    expect(limiter.getRemainingRequests()).toBe(2);
  });

  it('getTimeUntilNextSlot returns 0 when slots are available', () => {
    const limiter = new RateLimiter(5, 60_000);
    expect(limiter.getTimeUntilNextSlot()).toBe(0);
  });

  it('getTimeUntilNextSlot returns positive value when full', () => {
    const limiter = new RateLimiter(1, 10_000);
    limiter.recordRequest();

    const wait = limiter.getTimeUntilNextSlot();
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(10_000);
  });
});
