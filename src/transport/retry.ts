import { NetSuiteError } from '../types/errors.js';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  shouldRetry: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30_000,
  backoffFactor: 2,
  shouldRetry: (error: unknown) => {
    if (error instanceof NetSuiteError) {
      return error.isRetryable;
    }
    // Retry unknown errors (network failures, etc.)
    return true;
  },
};

/**
 * Execute a function with exponential backoff retry + jitter.
 * Each retry calls `fn()` fresh, so OAuth signatures get new nonces.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_CONFIG, ...config };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === opts.maxRetries;
      if (isLastAttempt || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      opts.onRetry?.(error, attempt + 1);

      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay,
      );
      // Add jitter: +/- 25% to prevent thundering herd
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new Error('Retry loop exited unexpectedly');
}
