/**
 * Sliding-window rate limiter.
 * Tracks requests within a time window and prevents exceeding the limit.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /** Check if a request can be made without exceeding the limit. */
  canMakeRequest(): boolean {
    this.pruneExpired();
    return this.timestamps.length < this.maxRequests;
  }

  /** Record that a request was made. */
  recordRequest(): void {
    this.pruneExpired();
    this.timestamps.push(Date.now());
  }

  /** Get the number of remaining requests in the current window. */
  getRemainingRequests(): number {
    this.pruneExpired();
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }

  /** Get ms until the next request slot opens. Returns 0 if a slot is available. */
  getTimeUntilNextSlot(): number {
    this.pruneExpired();
    if (this.timestamps.length < this.maxRequests) return 0;
    const oldest = this.timestamps[0];
    return Math.max(0, oldest + this.windowMs - Date.now());
  }

  private pruneExpired(): void {
    const cutoff = Date.now() - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0] <= cutoff) {
      this.timestamps.shift();
    }
  }
}
