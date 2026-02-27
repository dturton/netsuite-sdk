/** Raw SuiteQL API response envelope */
export interface SuiteQLRawResponse<T = Record<string, unknown>> {
  links: Array<{ rel: string; href: string }>;
  count: number;
  hasMore: boolean;
  offset: number;
  totalResults: number;
  items: T[];
}

/** Options for a SuiteQL query execution */
export interface SuiteQLOptions {
  /** Maximum rows to fetch per page. Default: 1000, Max: 1000 */
  pageSize?: number;
  /** Starting offset. Default: 0 */
  offset?: number;
  /** Maximum total rows to fetch across all pages. Default: Infinity */
  maxRows?: number;
  /** Override timeout for this query */
  timeout?: number;
}

/** Result of a SuiteQL query with metadata */
export interface SuiteQLResult<T = Record<string, unknown>> {
  /** All fetched rows */
  items: T[];
  /** Total results reported by NetSuite */
  totalResults: number;
  /** Number of pages fetched */
  pagesFetched: number;
  /** Whether more results exist beyond what was fetched */
  hasMore: boolean;
  /** Total execution time in ms */
  duration: number;
}
