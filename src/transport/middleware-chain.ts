import type { Middleware, RequestContext, ResponseContext } from '../types/middleware.js';

/**
 * Execute a chain of middleware functions, then the final handler.
 * Each middleware can modify the request context before calling next(),
 * and inspect/modify the response after.
 */
export function executeMiddlewareChain(
  middlewares: Middleware[],
  context: RequestContext,
  finalHandler: () => Promise<ResponseContext>,
): Promise<ResponseContext> {
  let index = 0;

  function next(): Promise<ResponseContext> {
    if (index >= middlewares.length) {
      return finalHandler();
    }
    const middleware = middlewares[index++];
    return middleware(context, next);
  }

  return next();
}
