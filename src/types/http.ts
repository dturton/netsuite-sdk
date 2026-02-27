import type { AxiosResponse } from 'axios';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  /** Override timeout for this request */
  timeout?: number;
  /** Override retry count for this request */
  maxRetries?: number;
}

export interface NetSuiteResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  duration: number;
}

/** Convert AxiosResponse headers to a plain record */
export function extractHeaders(response: AxiosResponse): Record<string, string> {
  const headers: Record<string, string> = {};
  if (response.headers) {
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }
  }
  return headers;
}
