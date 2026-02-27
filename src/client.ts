import { HttpTransport } from './transport/http-transport.js';
import { SuiteQLClient } from './suiteql/suiteql-client.js';
import { RecordClient } from './records/record-client.js';
import { RestletClient } from './restlets/restlet-client.js';
import { validateConfig } from './utils/validation.js';
import type { NetSuiteConfig } from './types/config.js';
import type { RequestOptions, NetSuiteResponse } from './types/http.js';
import type { Middleware } from './types/middleware.js';

/**
 * Main NetSuite API client.
 *
 * Provides namespaced access to SuiteQL, Record, and RESTlet APIs,
 * plus raw HTTP methods as an escape hatch.
 *
 * @example
 * ```ts
 * import { NetSuiteClient } from 'netsuite-sdk';
 *
 * const client = new NetSuiteClient({
 *   auth: {
 *     consumerKey: '...',
 *     consumerSecret: '...',
 *     tokenKey: '...',
 *     tokenSecret: '...',
 *     realm: '1234567',
 *   },
 *   accountId: '1234567',
 * });
 *
 * // SuiteQL
 * const result = await client.suiteql.query('SELECT id, companyname FROM customer');
 *
 * // Records
 * const customer = await client.records.get('customer', 123);
 *
 * // RESTlets
 * const data = await client.restlets.call({ script: '1', deploy: '1' });
 * ```
 */
export class NetSuiteClient {
  /** SuiteQL query execution and builder */
  public readonly suiteql: SuiteQLClient;

  /** REST Record API CRUD */
  public readonly records: RecordClient;

  /** RESTlet caller */
  public readonly restlets: RestletClient;

  private readonly transport: HttpTransport;

  constructor(config: NetSuiteConfig) {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid NetSuite configuration:\n  - ${errors.join('\n  - ')}`);
    }

    this.transport = new HttpTransport(config);
    this.suiteql = new SuiteQLClient(this.transport, config.accountId);
    this.records = new RecordClient(this.transport, config.accountId);
    this.restlets = new RestletClient(this.transport, config.accountId);
  }

  /** Add middleware to all requests. Returns `this` for chaining. */
  use(middleware: Middleware): this {
    this.transport.use(middleware);
    return this;
  }

  /** Make a raw HTTP request (escape hatch for custom endpoints). */
  async request<T = unknown>(
    url: string,
    options?: RequestOptions,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(url, options);
  }

  /** Convenience: GET request */
  async get<T = unknown>(
    url: string,
    options?: Omit<RequestOptions, 'method'>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(url, { ...options, method: 'GET' });
  }

  /** Convenience: POST request */
  async post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(url, { ...options, method: 'POST', body });
  }

  /** Convenience: PUT request */
  async put<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(url, { ...options, method: 'PUT', body });
  }

  /** Convenience: PATCH request */
  async patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(url, { ...options, method: 'PATCH', body });
  }

  /** Convenience: DELETE request */
  async delete<T = unknown>(
    url: string,
    options?: Omit<RequestOptions, 'method'>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(url, { ...options, method: 'DELETE' });
  }
}
