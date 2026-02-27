import type { Logger } from './logger.js';

export interface OAuthConfig {
  consumerKey: string;
  consumerSecret: string;
  tokenKey: string;
  tokenSecret: string;
  realm: string;
}

export interface NetSuiteConfig {
  /** OAuth 1.0a (TBA) credentials */
  auth: OAuthConfig;
  /** NetSuite account ID (e.g., "1234567" or "1234567_SB1" for sandbox) */
  accountId: string;
  /** Request timeout in ms. Default: 30000 */
  timeout?: number;
  /** Max retry attempts for transient errors. Default: 3 */
  maxRetries?: number;
  /** Initial retry delay in ms. Default: 1000 */
  retryDelay?: number;
  /** Default headers added to every request */
  defaultHeaders?: Record<string, string>;
  /** Optional logger */
  logger?: Logger;
}
