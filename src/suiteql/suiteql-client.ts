import type { HttpTransport } from '../transport/http-transport.js';
import type { SuiteQLOptions, SuiteQLResult, SuiteQLRawResponse } from '../types/suiteql.js';

/**
 * SuiteQL client for executing queries against the NetSuite SuiteQL REST endpoint.
 *
 * Handles the `Prefer: transient` header requirement and automatic pagination.
 */
export class SuiteQLClient {
  private transport: HttpTransport;
  private baseUrl: string;

  constructor(transport: HttpTransport, accountId: string) {
    this.transport = transport;
    const normalizedId = accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${normalizedId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
  }

  /**
   * Execute a SuiteQL query and return all matching rows.
   * Automatically paginates across multiple pages.
   *
   * @example
   * ```ts
   * const result = await client.suiteql.query<Customer>(
   *   'SELECT id, companyname, email FROM customer WHERE isinactive = \'F\'',
   *   { pageSize: 500 }
   * );
   * console.log(result.items); // all rows
   * console.log(result.totalResults); // total count from NetSuite
   * ```
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    options: SuiteQLOptions = {},
  ): Promise<SuiteQLResult<T>> {
    const {
      pageSize = 1000,
      offset: startOffset = 0,
      maxRows = Infinity,
      timeout,
    } = options;

    const allItems: T[] = [];
    let currentOffset = startOffset;
    let totalResults = 0;
    let pagesFetched = 0;
    const startTime = performance.now();

    while (true) {
      const effectiveLimit = Math.min(pageSize, maxRows - allItems.length);
      if (effectiveLimit <= 0) break;

      const url = `${this.baseUrl}?limit=${effectiveLimit}&offset=${currentOffset}`;

      const response = await this.transport.request<SuiteQLRawResponse<T>>(url, {
        method: 'POST',
        body: { q: sql },
        headers: { Prefer: 'transient' },
        timeout,
      });

      const page = response.data;
      totalResults = page.totalResults;
      pagesFetched++;

      allItems.push(...page.items);

      // Determine if more pages exist
      const hasMore = page.hasMore || currentOffset + page.items.length < totalResults;
      if (!hasMore || allItems.length >= maxRows || page.items.length === 0) break;

      currentOffset += page.items.length;
    }

    return {
      items: allItems,
      totalResults,
      pagesFetched,
      hasMore: allItems.length < totalResults,
      duration: Math.round(performance.now() - startTime),
    };
  }

  /**
   * Execute a query and return a single row, or null if not found.
   *
   * @example
   * ```ts
   * const customer = await client.suiteql.queryOne<Customer>(
   *   'SELECT id, companyname FROM customer WHERE id = 123'
   * );
   * ```
   */
  async queryOne<T = Record<string, unknown>>(
    sql: string,
    options?: Omit<SuiteQLOptions, 'maxRows'>,
  ): Promise<T | null> {
    const result = await this.query<T>(sql, { ...options, maxRows: 1 });
    return result.items[0] ?? null;
  }

  /**
   * Execute a query and yield pages as an async generator.
   * Useful for streaming large result sets without holding everything in memory.
   *
   * @example
   * ```ts
   * for await (const page of client.suiteql.queryPages<Transaction>(
   *   'SELECT id, tranid, total FROM transaction',
   *   { pageSize: 500 }
   * )) {
   *   await processBatch(page);
   * }
   * ```
   */
  async *queryPages<T = Record<string, unknown>>(
    sql: string,
    options: SuiteQLOptions = {},
  ): AsyncGenerator<T[], void, undefined> {
    const {
      pageSize = 1000,
      offset: startOffset = 0,
      maxRows = Infinity,
      timeout,
    } = options;

    let currentOffset = startOffset;
    let totalYielded = 0;

    while (true) {
      const effectiveLimit = Math.min(pageSize, maxRows - totalYielded);
      if (effectiveLimit <= 0) return;

      const url = `${this.baseUrl}?limit=${effectiveLimit}&offset=${currentOffset}`;

      const response = await this.transport.request<SuiteQLRawResponse<T>>(url, {
        method: 'POST',
        body: { q: sql },
        headers: { Prefer: 'transient' },
        timeout,
      });

      const page = response.data;

      if (page.items.length === 0) return;

      yield page.items;

      totalYielded += page.items.length;
      const hasMore = page.hasMore || currentOffset + page.items.length < page.totalResults;
      if (!hasMore || totalYielded >= maxRows) return;

      currentOffset += page.items.length;
    }
  }
}
