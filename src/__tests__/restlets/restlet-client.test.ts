import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestletClient } from '../../restlets/restlet-client.js';

function createMockTransport() {
  return {
    request: vi.fn().mockResolvedValue({
      data: { result: 'ok' },
      status: 200,
      headers: {},
      duration: 50,
    }),
    use: vi.fn(),
  };
}

describe('RestletClient', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let client: RestletClient;

  beforeEach(() => {
    transport = createMockTransport();
    client = new RestletClient(transport as any, '1234567');
  });

  it('builds the correct RESTlet URL', async () => {
    await client.call({ script: '100', deploy: '1' });

    const [url] = transport.request.mock.calls[0];
    expect(url).toBe(
      'https://1234567.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=100&deploy=1',
    );
  });

  it('normalizes account ID for sandbox', async () => {
    const sbClient = new RestletClient(transport as any, '1234567_SB1');
    await sbClient.call({ script: '100', deploy: '1' });

    const [url] = transport.request.mock.calls[0];
    expect(url).toContain('1234567-sb1.restlets.api.netsuite.com');
  });

  it('includes additional params in URL', async () => {
    await client.call({
      script: 100,
      deploy: 1,
      params: { action: 'search', type: 'customer', active: true },
    });

    const [url] = transport.request.mock.calls[0];
    expect(url).toContain('script=100');
    expect(url).toContain('deploy=1');
    expect(url).toContain('action=search');
    expect(url).toContain('type=customer');
    expect(url).toContain('active=true');
  });

  it('passes request options through', async () => {
    await client.call(
      { script: '100', deploy: '1' },
      { method: 'POST', body: { query: 'test' } },
    );

    const [, options] = transport.request.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toEqual({ query: 'test' });
  });

  it('accepts numeric script and deploy IDs', async () => {
    await client.call({ script: 100, deploy: 1 });

    const [url] = transport.request.mock.calls[0];
    expect(url).toContain('script=100');
    expect(url).toContain('deploy=1');
  });
});
