import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpTransport } from '../../transport/http-transport.js';
import { NetSuiteError } from '../../types/errors.js';
import type { NetSuiteConfig } from '../../types/config.js';

// Store a reference to the mock request function we can control
const mockRequest = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: mockRequest,
    })),
  },
}));

const mockConfig: NetSuiteConfig = {
  auth: {
    consumerKey: 'ck',
    consumerSecret: 'cs',
    tokenKey: 'tk',
    tokenSecret: 'ts',
    realm: 'REALM',
  },
  accountId: '1234567',
  maxRetries: 0, // Disable retries for unit tests
};

describe('HttpTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes a GET request with OAuth headers', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 200,
      data: { id: 1 },
      headers: { 'content-type': 'application/json' },
    });

    const result = await transport.request('https://test.com/api', {
      method: 'GET',
    });

    expect(mockRequest).toHaveBeenCalledTimes(1);
    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.method).toBe('GET');
    expect(callArgs.url).toBe('https://test.com/api');
    expect(callArgs.headers.Authorization).toContain('OAuth');
    expect(result.data).toEqual({ id: 1 });
    expect(result.status).toBe(200);
    expect(typeof result.duration).toBe('number');
  });

  it('makes a POST request with body', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 201,
      data: { id: 2 },
      headers: {},
    });

    const result = await transport.request('https://test.com/api', {
      method: 'POST',
      body: { name: 'test' },
    });

    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.method).toBe('POST');
    expect(callArgs.data).toEqual({ name: 'test' });
    expect(result.status).toBe(201);
  });

  it('does not send body for GET requests', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    await transport.request('https://test.com/api', {
      method: 'GET',
      body: { should: 'not be sent' },
    });

    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.data).toBeUndefined();
  });

  it('throws NetSuiteError on 4xx response', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 404,
      data: {
        title: 'Not Found',
        detail: 'Record not found',
        'o:errorCode': 'RCRD_DSNT_EXIST',
      },
      headers: {},
    });

    try {
      await transport.request('https://test.com/api/customer/999');
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(NetSuiteError);
      const err = e as NetSuiteError;
      expect(err.status).toBe(404);
      expect(err.code).toBe('RCRD_DSNT_EXIST');
      expect(err.message).toBe('Record not found');
      expect(err.isRetryable).toBe(false);
      expect(err.requestUrl).toBe('https://test.com/api/customer/999');
      expect(err.requestMethod).toBe('GET');
    }
  });

  it('throws NetSuiteError on 5xx response', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 500,
      data: { title: 'Internal Error' },
      headers: {},
    });

    try {
      await transport.request('https://test.com/api');
      expect.unreachable('Should have thrown');
    } catch (e) {
      const err = e as NetSuiteError;
      expect(err.status).toBe(500);
      expect(err.isRetryable).toBe(true);
    }
  });

  it('handles 204 No Content', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 204,
      data: null,
      headers: {},
    });

    const result = await transport.request('https://test.com/api/customer/1', {
      method: 'DELETE',
    });

    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });

  it('handles timeout errors', async () => {
    const transport = new HttpTransport(mockConfig);

    const err = new Error('timeout of 30000ms exceeded') as any;
    err.code = 'ECONNABORTED';
    mockRequest.mockRejectedValue(err);

    try {
      await transport.request('https://test.com/api');
      expect.unreachable('Should have thrown');
    } catch (e) {
      const err = e as NetSuiteError;
      expect(err.code).toBe('TIMEOUT');
      expect(err.status).toBe(504);
      expect(err.isRetryable).toBe(true);
    }
  });

  it('handles network errors', async () => {
    const transport = new HttpTransport(mockConfig);

    const err = new Error('getaddrinfo ENOTFOUND test.com') as any;
    err.code = 'ENOTFOUND';
    mockRequest.mockRejectedValue(err);

    try {
      await transport.request('https://test.com/api');
      expect.unreachable('Should have thrown');
    } catch (e) {
      const err = e as NetSuiteError;
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.status).toBe(0);
    }
  });

  it('executes middleware before making request', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: {},
    });

    transport.use(async (ctx, next) => {
      ctx.headers['X-Custom'] = 'test';
      return next();
    });

    await transport.request('https://test.com/api');

    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.headers['X-Custom']).toBe('test');
  });

  it('defaults method to GET', async () => {
    const transport = new HttpTransport(mockConfig);

    mockRequest.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    await transport.request('https://test.com/api');

    const callArgs = mockRequest.mock.calls[0][0];
    expect(callArgs.method).toBe('GET');
  });
});
