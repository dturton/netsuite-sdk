import OAuth from 'oauth-1.0a';
import { createHmac } from 'node:crypto';
import type { OAuthConfig } from '../types/config.js';
import type { HttpMethod } from '../types/http.js';

/**
 * Creates a reusable OAuth 1.0a signing function.
 * Each invocation generates a fresh nonce and timestamp,
 * so it's safe to call on every request (including retries).
 */
export function createOAuthSigner(
  config: OAuthConfig,
): (url: string, method: HttpMethod) => Record<string, string> {
  const oauth = new OAuth({
    consumer: { key: config.consumerKey, secret: config.consumerSecret },
    signature_method: 'HMAC-SHA256',
    hash_function: (baseString: string, key: string) =>
      createHmac('sha256', key).update(baseString).digest('base64'),
    realm: config.realm,
  });

  const token = { key: config.tokenKey, secret: config.tokenSecret };

  return (url: string, method: HttpMethod): Record<string, string> => {
    const requestData = { url, method };
    const authorization = oauth.authorize(requestData, token);
    return oauth.toHeader(authorization) as unknown as Record<string, string>;
  };
}
