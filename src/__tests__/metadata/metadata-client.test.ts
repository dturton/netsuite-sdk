import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MetadataClient } from '../../metadata/metadata-client.js';

function createMockTransport() {
  return {
    request: vi.fn().mockResolvedValue({
      data: { items: [] },
      status: 200,
      headers: {},
      duration: 50,
    }),
    use: vi.fn(),
  };
}

describe('MetadataClient', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let client: MetadataClient;

  beforeEach(() => {
    transport = createMockTransport();
    client = new MetadataClient(transport as any, '1234567');
  });

  it('normalizes account ID for URL', async () => {
    const sbClient = new MetadataClient(transport as any, '1234567_SB1');
    await sbClient.listRecordTypes();

    const [url] = transport.request.mock.calls[0];
    expect(url).toContain('1234567-sb1.suitetalk.api.netsuite.com');
  });

  describe('listRecordTypes', () => {
    it('makes a GET request to the metadata-catalog URL', async () => {
      await client.listRecordTypes();

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toBe(
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/metadata-catalog',
      );
      expect(options.headers.Accept).toBe('application/json');
    });

    it('supports select filter', async () => {
      await client.listRecordTypes({ select: ['customer', 'salesOrder'] });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('select=customer%2CsalesOrder');
    });
  });

  describe('getRecordMetadata', () => {
    it('makes a GET request for a specific record type with OpenAPI format by default', async () => {
      await client.getRecordMetadata('customer');

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toBe(
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/metadata-catalog/customer',
      );
      expect(options.headers.Accept).toBe('application/swagger+json');
    });

    it('supports jsonschema format', async () => {
      await client.getRecordMetadata('customer', { format: 'jsonschema' });

      const [, options] = transport.request.mock.calls[0];
      expect(options.headers.Accept).toBe('application/schema+json');
    });

    it('supports openapi format explicitly', async () => {
      await client.getRecordMetadata('salesOrder', { format: 'openapi' });

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/metadata-catalog/salesOrder');
      expect(options.headers.Accept).toBe('application/swagger+json');
    });
  });

  describe('getOpenApiSpec', () => {
    it('makes a GET request with swagger accept header', async () => {
      await client.getOpenApiSpec();

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toBe(
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/metadata-catalog',
      );
      expect(options.headers.Accept).toBe('application/swagger+json');
    });

    it('supports select filter', async () => {
      await client.getOpenApiSpec({ select: ['invoice', 'journalEntry'] });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('select=invoice%2CjournalEntry');
    });
  });
});
