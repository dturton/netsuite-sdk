/** Options for listing records */
export interface RecordListOptions {
  limit?: number;
  offset?: number;
  fields?: string[];
  /** URL query params for filtering */
  query?: Record<string, string>;
  expandSubResources?: boolean;
}

/** Response from listing records */
export interface RecordListResponse<T = Record<string, unknown>> {
  links: Array<{ rel: string; href: string }>;
  count: number;
  hasMore: boolean;
  offset: number;
  totalResults: number;
  items: T[];
}

/** Options for getting a single record */
export interface RecordGetOptions {
  fields?: string[];
  expandSubResources?: boolean;
}

/**
 * Common NetSuite record types with autocomplete support.
 * Any string is accepted for custom/unlisted record types.
 */
export type RecordType =
  | 'customer'
  | 'vendor'
  | 'employee'
  | 'salesOrder'
  | 'purchaseOrder'
  | 'invoice'
  | 'item'
  | 'contact'
  | 'opportunity'
  | 'journalEntry'
  | 'creditMemo'
  | 'inventoryItem'
  | 'nonInventoryItem'
  | 'serviceItem'
  | (string & {});
