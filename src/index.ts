// Main client
export { NetSuiteClient } from './client.js';

// SuiteQL query builder
export { SuiteQLBuilder, suiteql } from './suiteql/query-builder.js';

// Error class
export { NetSuiteError } from './types/errors.js';

// Types
export type {
  // Config
  NetSuiteConfig,
  OAuthConfig,
  // HTTP
  HttpMethod,
  RequestOptions,
  NetSuiteResponse,
  // SuiteQL
  SuiteQLOptions,
  SuiteQLResult,
  SuiteQLRawResponse,
  // Records
  RecordType,
  RecordGetOptions,
  RecordListOptions,
  RecordListResponse,
  // Middleware
  Middleware,
  RequestContext,
  ResponseContext,
  // Logger
  Logger,
  // Error details
  NetSuiteErrorDetail,
} from './types/index.js';

// RESTlet types
export type { RestletParams } from './restlets/restlet-client.js';

// Utilities
export { ResponseCache, createCacheKey } from './utils/response-cache.js';
export { RateLimiter } from './utils/rate-limiter.js';
export { validateConfig } from './utils/validation.js';
export { formatNetSuiteDate, parseNetSuiteDate } from './utils/date.js';
export { parseNetSuiteError } from './utils/error-parser.js';
export { normalizeAccountId } from './utils/url-builder.js';
