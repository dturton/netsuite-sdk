import { describe, it, expect, vi } from 'vitest';
import { NetSuiteClient } from '../client.js';
import { SuiteQLClient } from '../suiteql/suiteql-client.js';
import { RecordClient } from '../records/record-client.js';
import { RestletClient } from '../restlets/restlet-client.js';

// Mock the transport so we don't make real HTTP calls
vi.mock('../transport/http-transport.js', () => ({
  HttpTransport: vi.fn().mockImplementation(() => ({
    request: vi.fn().mockResolvedValue({
      data: {},
      status: 200,
      headers: {},
      duration: 50,
    }),
    use: vi.fn(),
  })),
}));

const validConfig = {
  auth: {
    consumerKey: 'ck',
    consumerSecret: 'cs',
    tokenKey: 'tk',
    tokenSecret: 'ts',
    realm: 'REALM',
  },
  accountId: '1234567',
};

describe('NetSuiteClient', () => {
  it('creates a client with valid config', () => {
    const client = new NetSuiteClient(validConfig);
    expect(client).toBeDefined();
    expect(client.suiteql).toBeInstanceOf(SuiteQLClient);
    expect(client.records).toBeInstanceOf(RecordClient);
    expect(client.restlets).toBeInstanceOf(RestletClient);
  });

  it('throws on invalid config', () => {
    expect(() => new NetSuiteClient({} as any)).toThrow('Invalid NetSuite configuration');
  });

  it('throws on missing auth', () => {
    expect(
      () => new NetSuiteClient({ accountId: '123' } as any),
    ).toThrow('auth is required');
  });

  it('throws on missing accountId', () => {
    expect(
      () =>
        new NetSuiteClient({
          auth: validConfig.auth,
        } as any),
    ).toThrow('accountId is required');
  });

  it('exposes convenience HTTP methods', async () => {
    const client = new NetSuiteClient(validConfig);

    // These should not throw (they call through to the mock transport)
    await expect(client.get('https://test.com')).resolves.toBeDefined();
    await expect(client.post('https://test.com', {})).resolves.toBeDefined();
    await expect(client.put('https://test.com', {})).resolves.toBeDefined();
    await expect(client.patch('https://test.com', {})).resolves.toBeDefined();
    await expect(client.delete('https://test.com')).resolves.toBeDefined();
  });

  it('use() returns this for chaining', () => {
    const client = new NetSuiteClient(validConfig);
    const result = client.use(async (ctx, next) => next());
    expect(result).toBe(client);
  });
});
