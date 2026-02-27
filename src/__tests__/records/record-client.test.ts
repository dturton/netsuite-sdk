import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordClient } from '../../records/record-client.js';

function createMockTransport() {
  return {
    request: vi.fn().mockResolvedValue({
      data: { id: 1 },
      status: 200,
      headers: {},
      duration: 50,
    }),
    use: vi.fn(),
  };
}

describe('RecordClient', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let client: RecordClient;

  beforeEach(() => {
    transport = createMockTransport();
    client = new RecordClient(transport as any, '1234567');
  });

  it('normalizes account ID for URL', async () => {
    const sbClient = new RecordClient(transport as any, '1234567_SB1');
    await sbClient.get('customer', 1);

    const [url] = transport.request.mock.calls[0];
    expect(url).toContain('1234567-sb1.suitetalk.api.netsuite.com');
  });

  describe('get', () => {
    it('makes a GET request to the correct URL', async () => {
      await client.get('customer', 123);

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toBe(
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/customer/123',
      );
      expect(options).toBeUndefined();
    });

    it('supports fields option', async () => {
      await client.get('customer', 123, { fields: ['id', 'companyname', 'email'] });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('fields=id%2Ccompanyname%2Cemail');
    });

    it('supports expandSubResources option', async () => {
      await client.get('customer', 123, { expandSubResources: true });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('expandSubResources=true');
    });
  });

  describe('list', () => {
    it('makes a GET request', async () => {
      await client.list('customer');

      const [url] = transport.request.mock.calls[0];
      expect(url).toBe(
        'https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/customer',
      );
    });

    it('supports limit and offset', async () => {
      await client.list('customer', { limit: 10, offset: 20 });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
    });

    it('supports query params', async () => {
      await client.list('customer', {
        query: { q: "email IS 'test@example.com'" },
      });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('q=');
    });
  });

  describe('create', () => {
    it('makes a POST request', async () => {
      await client.create('customer', { companyname: 'Test Corp' });

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/customer');
      expect(options.method).toBe('POST');
      expect(options.body).toEqual({ companyname: 'Test Corp' });
    });
  });

  describe('update', () => {
    it('makes a PATCH request', async () => {
      await client.update('customer', 123, { email: 'new@test.com' });

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/customer/123');
      expect(options.method).toBe('PATCH');
      expect(options.body).toEqual({ email: 'new@test.com' });
    });
  });

  describe('replace', () => {
    it('makes a PUT request', async () => {
      await client.replace('customer', 123, { companyname: 'New Name' });

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/customer/123');
      expect(options.method).toBe('PUT');
    });
  });

  describe('delete', () => {
    it('makes a DELETE request', async () => {
      await client.delete('customer', 123);

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/customer/123');
      expect(options.method).toBe('DELETE');
    });
  });

  describe('upsert', () => {
    it('makes a PUT request with external ID URL', async () => {
      await client.upsert('customer', 'externalId', 'EXT-001', {
        companyname: 'Upserted Corp',
      });

      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/customer/eid:externalId=EXT-001');
      expect(options.method).toBe('PUT');
      expect(options.body).toEqual({ companyname: 'Upserted Corp' });
    });
  });
});
