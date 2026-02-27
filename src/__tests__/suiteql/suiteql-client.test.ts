import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SuiteQLClient } from '../../suiteql/suiteql-client.js';

function createMockTransport() {
  return {
    request: vi.fn(),
    use: vi.fn(),
  };
}

function createPageResponse<T>(
  items: T[],
  totalResults: number,
  offset: number,
  hasMore: boolean,
) {
  return {
    data: {
      links: [],
      count: items.length,
      hasMore,
      offset,
      totalResults,
      items,
    },
    status: 200,
    headers: {},
    duration: 50,
  };
}

describe('SuiteQLClient', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let client: SuiteQLClient;

  beforeEach(() => {
    transport = createMockTransport();
    client = new SuiteQLClient(transport as any, '1234567');
  });

  describe('query', () => {
    it('executes a SuiteQL query with Prefer: transient header', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([{ id: '1' }], 1, 0, false),
      );

      await client.query('SELECT id FROM customer');

      expect(transport.request).toHaveBeenCalledTimes(1);
      const [url, options] = transport.request.mock.calls[0];
      expect(url).toContain('/services/rest/query/v1/suiteql');
      expect(options.method).toBe('POST');
      expect(options.body).toEqual({ q: 'SELECT id FROM customer' });
      expect(options.headers).toEqual({ Prefer: 'transient' });
    });

    it('normalizes account ID with underscores to hyphens', async () => {
      const sbClient = new SuiteQLClient(transport as any, '1234567_SB1');
      transport.request.mockResolvedValue(
        createPageResponse([], 0, 0, false),
      );

      await sbClient.query('SELECT 1');
      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('1234567-sb1.suitetalk.api.netsuite.com');
    });

    it('returns items and metadata', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([{ id: '1' }, { id: '2' }], 2, 0, false),
      );

      const result = await client.query('SELECT id FROM customer');

      expect(result.items).toEqual([{ id: '1' }, { id: '2' }]);
      expect(result.totalResults).toBe(2);
      expect(result.pagesFetched).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(typeof result.duration).toBe('number');
    });

    it('auto-paginates across multiple pages', async () => {
      transport.request
        .mockResolvedValueOnce(
          createPageResponse(
            Array(1000).fill({ id: '1' }),
            2500,
            0,
            true,
          ),
        )
        .mockResolvedValueOnce(
          createPageResponse(
            Array(1000).fill({ id: '2' }),
            2500,
            1000,
            true,
          ),
        )
        .mockResolvedValueOnce(
          createPageResponse(
            Array(500).fill({ id: '3' }),
            2500,
            2000,
            false,
          ),
        );

      const result = await client.query('SELECT id FROM customer');

      expect(result.items).toHaveLength(2500);
      expect(result.pagesFetched).toBe(3);
      expect(result.hasMore).toBe(false);
      expect(transport.request).toHaveBeenCalledTimes(3);
    });

    it('respects maxRows option', async () => {
      transport.request.mockResolvedValue(
        createPageResponse(
          Array(100).fill({ id: '1' }),
          5000,
          0,
          true,
        ),
      );

      const result = await client.query('SELECT id FROM customer', {
        maxRows: 100,
        pageSize: 100,
      });

      expect(result.items).toHaveLength(100);
      expect(result.hasMore).toBe(true);
      expect(transport.request).toHaveBeenCalledTimes(1);
    });

    it('respects pageSize option in URL', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([], 0, 0, false),
      );

      await client.query('SELECT id FROM customer', { pageSize: 500 });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('limit=500');
    });

    it('respects offset option', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([], 0, 100, false),
      );

      await client.query('SELECT id FROM customer', { offset: 100 });

      const [url] = transport.request.mock.calls[0];
      expect(url).toContain('offset=100');
    });

    it('stops on empty page', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([], 0, 0, false),
      );

      const result = await client.query('SELECT id FROM customer WHERE 1=0');

      expect(result.items).toHaveLength(0);
      expect(result.pagesFetched).toBe(1);
    });
  });

  describe('queryOne', () => {
    it('returns the first row', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([{ id: '1', name: 'Test' }], 1, 0, false),
      );

      const result = await client.queryOne('SELECT id, name FROM customer WHERE id = 1');

      expect(result).toEqual({ id: '1', name: 'Test' });
    });

    it('returns null when no results', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([], 0, 0, false),
      );

      const result = await client.queryOne('SELECT id FROM customer WHERE id = -1');

      expect(result).toBeNull();
    });
  });

  describe('queryPages', () => {
    it('yields pages as an async generator', async () => {
      transport.request
        .mockResolvedValueOnce(
          createPageResponse([{ id: '1' }, { id: '2' }], 4, 0, true),
        )
        .mockResolvedValueOnce(
          createPageResponse([{ id: '3' }, { id: '4' }], 4, 2, false),
        );

      const pages: Array<Record<string, unknown>[]> = [];
      for await (const page of client.queryPages('SELECT id FROM customer', { pageSize: 2 })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(pages[0]).toEqual([{ id: '1' }, { id: '2' }]);
      expect(pages[1]).toEqual([{ id: '3' }, { id: '4' }]);
    });

    it('respects maxRows across pages', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([{ id: '1' }, { id: '2' }], 100, 0, true),
      );

      const pages: Array<Record<string, unknown>[]> = [];
      for await (const page of client.queryPages('SELECT id FROM customer', {
        pageSize: 2,
        maxRows: 2,
      })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(1);
      expect(transport.request).toHaveBeenCalledTimes(1);
    });

    it('stops on empty page', async () => {
      transport.request.mockResolvedValue(
        createPageResponse([], 0, 0, false),
      );

      const pages: Array<Record<string, unknown>[]> = [];
      for await (const page of client.queryPages('SELECT id FROM customer WHERE 1=0')) {
        pages.push(page);
      }

      expect(pages).toHaveLength(0);
    });
  });
});
