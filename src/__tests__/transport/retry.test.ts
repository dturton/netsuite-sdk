import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../transport/retry.js';
import { NetSuiteError } from '../../types/errors.js';

describe('withRetry', () => {
  it('returns the result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns on success', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      withRetry(fn, { maxRetries: 2, initialDelay: 10 }),
    ).rejects.toThrow('always fails');

    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable NetSuiteErrors', async () => {
    const error = new NetSuiteError('Not Found', 404, 'NOT_FOUND');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, { maxRetries: 3, initialDelay: 10 }),
    ).rejects.toThrow('Not Found');

    // 404 is not retryable, so only 1 call
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable NetSuiteErrors (5xx)', async () => {
    const error = new NetSuiteError('Server Error', 500, 'SERVER_ERROR');
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('recovered');

    const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries TIMEOUT errors', async () => {
    const error = new NetSuiteError('Timeout', 504, 'TIMEOUT');
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('recovered');

    const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('calls onRetry callback on each retry', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');

    await withRetry(fn, { maxRetries: 3, initialDelay: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('respects custom shouldRetry', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('custom'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(
      withRetry(fn, { maxRetries: 3, initialDelay: 10, shouldRetry }),
    ).rejects.toThrow('custom');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });
});
