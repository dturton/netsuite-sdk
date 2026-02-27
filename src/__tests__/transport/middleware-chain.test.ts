import { describe, it, expect, vi } from 'vitest';
import { executeMiddlewareChain } from '../../transport/middleware-chain.js';
import type { Middleware, RequestContext, ResponseContext } from '../../types/middleware.js';

function createContext(overrides?: Partial<RequestContext>): RequestContext {
  return {
    url: 'https://test.com',
    method: 'GET',
    headers: {},
    metadata: {},
    ...overrides,
  };
}

function createResponse(overrides?: Partial<ResponseContext>): ResponseContext {
  return {
    status: 200,
    headers: {},
    body: { ok: true },
    duration: 100,
    ...overrides,
  };
}

describe('executeMiddlewareChain', () => {
  it('calls the final handler when no middleware is provided', async () => {
    const handler = vi.fn().mockResolvedValue(createResponse());
    const ctx = createContext();

    const result = await executeMiddlewareChain([], ctx, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it('executes middleware in order', async () => {
    const order: number[] = [];

    const mw1: Middleware = async (ctx, next) => {
      order.push(1);
      const res = await next();
      order.push(4);
      return res;
    };

    const mw2: Middleware = async (ctx, next) => {
      order.push(2);
      const res = await next();
      order.push(3);
      return res;
    };

    const handler = vi.fn().mockResolvedValue(createResponse());
    await executeMiddlewareChain([mw1, mw2], createContext(), handler);

    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('allows middleware to modify request context', async () => {
    const mw: Middleware = async (ctx, next) => {
      ctx.headers['X-Custom'] = 'value';
      return next();
    };

    const handler = vi.fn().mockResolvedValue(createResponse());
    const ctx = createContext();

    await executeMiddlewareChain([mw], ctx, handler);

    expect(ctx.headers['X-Custom']).toBe('value');
  });

  it('allows middleware to modify response', async () => {
    const mw: Middleware = async (ctx, next) => {
      const res = await next();
      return { ...res, body: { modified: true } };
    };

    const handler = vi.fn().mockResolvedValue(createResponse());
    const result = await executeMiddlewareChain([mw], createContext(), handler);

    expect(result.body).toEqual({ modified: true });
  });

  it('allows middleware to short-circuit without calling next', async () => {
    const mw: Middleware = async () => {
      return createResponse({ status: 403, body: { error: 'denied' } });
    };

    const handler = vi.fn().mockResolvedValue(createResponse());
    const result = await executeMiddlewareChain([mw], createContext(), handler);

    expect(handler).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
  });

  it('propagates errors from middleware', async () => {
    const mw: Middleware = async () => {
      throw new Error('middleware error');
    };

    const handler = vi.fn().mockResolvedValue(createResponse());

    await expect(
      executeMiddlewareChain([mw], createContext(), handler),
    ).rejects.toThrow('middleware error');
  });
});
