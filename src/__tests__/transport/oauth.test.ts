import { describe, it, expect } from 'vitest';
import { createOAuthSigner } from '../../transport/oauth.js';

const mockOAuthConfig = {
  consumerKey: 'test-consumer-key',
  consumerSecret: 'test-consumer-secret',
  tokenKey: 'test-token-key',
  tokenSecret: 'test-token-secret',
  realm: 'TEST_REALM',
};

describe('createOAuthSigner', () => {
  it('returns a function', () => {
    const sign = createOAuthSigner(mockOAuthConfig);
    expect(typeof sign).toBe('function');
  });

  it('generates an Authorization header', () => {
    const sign = createOAuthSigner(mockOAuthConfig);
    const headers = sign('https://example.suitetalk.api.netsuite.com/test', 'GET');

    expect(headers).toHaveProperty('Authorization');
    expect(headers.Authorization).toContain('OAuth');
    expect(headers.Authorization).toContain('oauth_consumer_key="test-consumer-key"');
    expect(headers.Authorization).toContain('oauth_token="test-token-key"');
    expect(headers.Authorization).toContain('oauth_signature_method="HMAC-SHA256"');
    expect(headers.Authorization).toContain('realm="TEST_REALM"');
  });

  it('generates different nonces on each call', () => {
    const sign = createOAuthSigner(mockOAuthConfig);
    const url = 'https://example.suitetalk.api.netsuite.com/test';

    const headers1 = sign(url, 'GET');
    const headers2 = sign(url, 'GET');

    // Extract nonce from Authorization header
    const nonceRegex = /oauth_nonce="([^"]+)"/;
    const nonce1 = headers1.Authorization.match(nonceRegex)?.[1];
    const nonce2 = headers2.Authorization.match(nonceRegex)?.[1];

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });

  it('includes oauth_signature', () => {
    const sign = createOAuthSigner(mockOAuthConfig);
    const headers = sign('https://example.com/test', 'POST');

    expect(headers.Authorization).toContain('oauth_signature="');
  });
});
