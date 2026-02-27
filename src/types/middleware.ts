import type { HttpMethod } from './http.js';

export interface RequestContext {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: unknown;
  metadata: Record<string, unknown>;
}

export interface ResponseContext {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

export type Middleware = (
  context: RequestContext,
  next: () => Promise<ResponseContext>,
) => Promise<ResponseContext>;
