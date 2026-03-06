import type { HttpTransport } from '../transport/http-transport.js';
import type { NetSuiteResponse } from '../types/http.js';
import type {
  MetadataCatalogOptions,
  MetadataCatalogResponse,
  RecordMetadataOptions,
} from '../types/metadata.js';

const FORMAT_HEADERS: Record<string, string> = {
  openapi: 'application/swagger+json',
  jsonschema: 'application/schema+json',
};

/**
 * Client for NetSuite REST API metadata-catalog endpoint.
 * Provides introspection of available record types, fields, and OpenAPI specs.
 */
export class MetadataClient {
  private transport: HttpTransport;
  private baseUrl: string;

  constructor(transport: HttpTransport, accountId: string) {
    const normalizedId = accountId.toLowerCase().replace(/_/g, '-');
    this.baseUrl = `https://${normalizedId}.suitetalk.api.netsuite.com/services/rest/record/v1/metadata-catalog`;
    this.transport = transport;
  }

  /** List all available record types from the metadata catalog */
  async listRecordTypes(
    options?: MetadataCatalogOptions,
  ): Promise<NetSuiteResponse<MetadataCatalogResponse>> {
    const url = this.buildUrl(options?.select);
    return this.transport.request<MetadataCatalogResponse>(url, {
      headers: { Accept: 'application/json' },
    });
  }

  /** Get OpenAPI 3.0 or JSON Schema metadata for a specific record type */
  async getRecordMetadata(
    recordType: string,
    options?: RecordMetadataOptions,
  ): Promise<NetSuiteResponse<Record<string, unknown>>> {
    const format = options?.format ?? 'openapi';
    const accept = FORMAT_HEADERS[format] ?? FORMAT_HEADERS.openapi;
    return this.transport.request<Record<string, unknown>>(
      `${this.baseUrl}/${recordType}`,
      { headers: { Accept: accept } },
    );
  }

  /** Get the full OpenAPI 3.0 spec for selected record types (or all) */
  async getOpenApiSpec(
    options?: MetadataCatalogOptions,
  ): Promise<NetSuiteResponse<Record<string, unknown>>> {
    const url = this.buildUrl(options?.select);
    return this.transport.request<Record<string, unknown>>(url, {
      headers: { Accept: 'application/swagger+json' },
    });
  }

  private buildUrl(select?: string[]): string {
    if (select?.length) {
      const params = new URLSearchParams({ select: select.join(',') });
      return `${this.baseUrl}?${params.toString()}`;
    }
    return this.baseUrl;
  }
}
