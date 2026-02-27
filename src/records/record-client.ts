import type { HttpTransport } from '../transport/http-transport.js';
import type { NetSuiteResponse } from '../types/http.js';
import type {
  RecordType,
  RecordGetOptions,
  RecordListOptions,
  RecordListResponse,
} from '../types/records.js';

/**
 * Client for NetSuite REST Record API v1.
 * Provides CRUD operations on NetSuite records.
 */
export class RecordClient {
  private transport: HttpTransport;
  private baseUrl: string;

  constructor(transport: HttpTransport, accountId: string) {
    this.transport = transport;
    const normalizedId = accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${normalizedId}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  }

  /** Get a record by type and internal ID */
  async get<T = Record<string, unknown>>(
    recordType: RecordType,
    id: string | number,
    options?: RecordGetOptions,
  ): Promise<NetSuiteResponse<T>> {
    const params = new URLSearchParams();
    if (options?.fields?.length) {
      params.set('fields', options.fields.join(','));
    }
    if (options?.expandSubResources) {
      params.set('expandSubResources', 'true');
    }
    const qs = params.toString();
    const url = `${this.baseUrl}/${recordType}/${id}${qs ? `?${qs}` : ''}`;

    return this.transport.request<T>(url);
  }

  /** List records of a given type */
  async list<T = Record<string, unknown>>(
    recordType: RecordType,
    options?: RecordListOptions,
  ): Promise<NetSuiteResponse<RecordListResponse<T>>> {
    const params = new URLSearchParams();
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.offset != null) params.set('offset', String(options.offset));
    if (options?.fields?.length) params.set('fields', options.fields.join(','));
    if (options?.expandSubResources) params.set('expandSubResources', 'true');
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    const url = `${this.baseUrl}/${recordType}${qs ? `?${qs}` : ''}`;

    return this.transport.request<RecordListResponse<T>>(url);
  }

  /** Create a new record */
  async create<T = Record<string, unknown>>(
    recordType: RecordType,
    body: Record<string, unknown>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(`${this.baseUrl}/${recordType}`, {
      method: 'POST',
      body,
    });
  }

  /** Update an existing record (partial update via PATCH) */
  async update<T = Record<string, unknown>>(
    recordType: RecordType,
    id: string | number,
    body: Record<string, unknown>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(`${this.baseUrl}/${recordType}/${id}`, {
      method: 'PATCH',
      body,
    });
  }

  /** Replace an existing record (full replace via PUT) */
  async replace<T = Record<string, unknown>>(
    recordType: RecordType,
    id: string | number,
    body: Record<string, unknown>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(`${this.baseUrl}/${recordType}/${id}`, {
      method: 'PUT',
      body,
    });
  }

  /** Delete a record */
  async delete(
    recordType: RecordType,
    id: string | number,
  ): Promise<NetSuiteResponse<void>> {
    return this.transport.request<void>(`${this.baseUrl}/${recordType}/${id}`, {
      method: 'DELETE',
    });
  }

  /** Upsert: create or update based on external ID */
  async upsert<T = Record<string, unknown>>(
    recordType: RecordType,
    externalIdField: string,
    externalIdValue: string,
    body: Record<string, unknown>,
  ): Promise<NetSuiteResponse<T>> {
    return this.transport.request<T>(
      `${this.baseUrl}/${recordType}/eid:${externalIdField}=${externalIdValue}`,
      { method: 'PUT', body },
    );
  }
}
