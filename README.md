# netsuite-sdk

[![npm version](https://img.shields.io/npm/v/netsuite-sdk.svg)](https://www.npmjs.com/package/netsuite-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

A TypeScript-first NetSuite REST API client with first-class SuiteQL support, OAuth 1.0a (TBA) authentication, automatic pagination, retries with exponential backoff, and a fluent query builder.

## Why netsuite-sdk?

- **SuiteQL-first** — Auto-pagination, streaming with `AsyncGenerator`, and a fluent query builder that escapes values and maps booleans to `'T'`/`'F'`
- **Full REST Record API** — `get`, `list`, `create`, `update`, `replace`, `delete`, `upsert` with typed generics
- **RESTlet support** — Call custom RESTlets by script/deploy ID
- **Resilient** — Exponential backoff with jitter, fresh OAuth nonce on each retry, configurable retry strategies
- **Middleware pipeline** — Composable request/response hooks for logging, caching, rate limiting, or custom headers
- **TypeScript-first** — Strict mode, full type inference, generics on every API method
- **Dual format** — Ships both CJS and ESM with `.d.ts` declarations and source maps
- **Zero config** — Sensible defaults for timeout (30s), retries (3), page size (1000)

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [SuiteQL](#suiteql)
  - [Query all rows](#query-all-rows)
  - [Query a single row](#query-a-single-row)
  - [Stream pages](#stream-pages)
  - [Query builder](#query-builder)
  - [Pagination options](#pagination-options)
- [REST Record API](#rest-record-api)
- [RESTlets](#restlets)
- [Raw HTTP](#raw-http)
- [Middleware](#middleware)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Utilities](#utilities)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Contributing](#contributing)
- [License](#license)

## Install

```bash
npm install netsuite-sdk
```

```bash
yarn add netsuite-sdk
```

```bash
pnpm add netsuite-sdk
```

## Quick Start

```ts
import { NetSuiteClient } from 'netsuite-sdk';

const client = new NetSuiteClient({
  auth: {
    consumerKey: process.env.NS_CONSUMER_KEY!,
    consumerSecret: process.env.NS_CONSUMER_SECRET!,
    tokenKey: process.env.NS_TOKEN_KEY!,
    tokenSecret: process.env.NS_TOKEN_SECRET!,
    realm: process.env.NS_ACCOUNT_ID!,
  },
  accountId: process.env.NS_ACCOUNT_ID!, // e.g. "1234567" or "1234567_SB1"
});

// Run a SuiteQL query
const { items } = await client.suiteql.query<{ id: string; companyname: string }>(
  'SELECT id, companyname FROM customer WHERE ROWNUM <= 10'
);

console.log(items);
```

> **Sandbox accounts**: Use the `"1234567_SB1"` format for `accountId`. Underscores are automatically converted to hyphens for URL construction (e.g. `1234567-sb1.suitetalk.api.netsuite.com`).

## SuiteQL

### Query all rows

Auto-paginates across multiple API calls and returns every matching row:

```ts
interface Customer {
  id: string;
  companyname: string;
  email: string;
}

const result = await client.suiteql.query<Customer>(
  "SELECT id, companyname, email FROM customer WHERE isinactive = 'F'"
);

result.items;        // Customer[] — all rows across all pages
result.totalResults; // total count reported by NetSuite
result.pagesFetched; // number of API round-trips
result.hasMore;      // false when all matching rows were fetched
result.duration;     // total elapsed time in ms
```

### Query a single row

Returns the first row, or `null` if no rows match:

```ts
const customer = await client.suiteql.queryOne<Customer>(
  'SELECT id, companyname FROM customer WHERE id = 123'
);

if (customer) {
  console.log(customer.companyname);
}
```

### Stream pages

Use `queryPages()` for large result sets. It returns an `AsyncGenerator` that yields one page at a time, keeping memory usage constant:

```ts
let processed = 0;

for await (const page of client.suiteql.queryPages<Customer>(
  'SELECT id, companyname FROM customer',
  { pageSize: 500 }
)) {
  await insertBatch(page); // page is Customer[]
  processed += page.length;
  console.log(`Processed ${processed} rows...`);
}
```

### Query builder

Build SuiteQL queries programmatically with automatic value escaping:

```ts
import { suiteql } from 'netsuite-sdk';

const sql = suiteql()
  .select('c.id', 'c.companyname', 'COUNT(t.id) AS order_count')
  .from('customer', 'c')
  .leftJoin('transaction t', 'c.id = t.entity')
  .whereEquals('c.isinactive', false) // false → 'F' automatically
  .whereNotNull('c.email')
  .whereIn('c.subsidiary', [1, 2, 3])
  .whereBetween('t.trandate', '2024-01-01', '2024-12-31')
  .groupBy('c.id', 'c.companyname')
  .having('COUNT(t.id) > 0')
  .orderBy('order_count', 'DESC')
  .build();

const result = await client.suiteql.query(sql);
```

**Available builder methods:**

| Method | Example |
|--------|---------|
| `select(...columns)` | `.select('id', 'name')` |
| `from(table, alias?)` | `.from('customer', 'c')` |
| `join(table, condition)` | `.join('transaction t', 'c.id = t.entity')` |
| `leftJoin(table, condition)` | `.leftJoin('address a', 'c.id = a.entity')` |
| `rightJoin(table, condition)` | `.rightJoin('subsidiary s', 'c.subsidiary = s.id')` |
| `where(condition)` | `.where('ROWNUM <= 100')` |
| `whereEquals(col, val)` | `.whereEquals('isinactive', false)` |
| `whereNotEquals(col, val)` | `.whereNotEquals('status', 'closed')` |
| `whereIn(col, values)` | `.whereIn('id', [1, 2, 3])` |
| `whereNull(col)` | `.whereNull('email')` |
| `whereNotNull(col)` | `.whereNotNull('email')` |
| `whereBetween(col, start, end)` | `.whereBetween('total', 100, 500)` |
| `whereLike(col, pattern)` | `.whereLike('name', '%acme%')` |
| `groupBy(...columns)` | `.groupBy('subsidiary')` |
| `having(condition)` | `.having('COUNT(*) > 5')` |
| `orderBy(col, direction?)` | `.orderBy('name', 'ASC')` |

**Value escaping rules:**

- **Numbers** — passed through as-is: `100`
- **Booleans** — mapped to NetSuite convention: `true` → `'T'`, `false` → `'F'`
- **Strings** — wrapped in single quotes with internal quotes doubled: `O'Brien` → `'O''Brien'`

### Pagination options

```ts
await client.suiteql.query(sql, {
  pageSize: 500,    // rows per API call (default: 1000, max: 1000)
  offset: 0,        // starting offset (default: 0)
  maxRows: 10000,   // cap total rows fetched (default: Infinity)
  timeout: 60000,   // override timeout for this query (ms)
});
```

## REST Record API

Full CRUD operations on any NetSuite record type:

```ts
// Get a single record
const customer = await client.records.get('customer', 123, {
  fields: ['companyname', 'email', 'phone'],
  expandSubResources: true,
});
console.log(customer.data.companyname);

// List records
const invoices = await client.records.list('invoice', {
  limit: 25,
  offset: 0,
  fields: ['tranid', 'total', 'status'],
  query: { status: 'open' },
});

// Create a record
const created = await client.records.create('customer', {
  companyname: 'Acme Corp',
  email: 'info@acme.com',
  subsidiary: { id: 1 },
});

// Update (PATCH — partial update, only sends changed fields)
await client.records.update('customer', 123, {
  email: 'new@acme.com',
});

// Replace (PUT — full replace)
await client.records.replace('customer', 123, {
  companyname: 'New Name',
  email: 'new@acme.com',
});

// Delete
await client.records.delete('customer', 123);

// Upsert via external ID
await client.records.upsert('customer', 'externalId', 'CRM-12345', {
  companyname: 'Upserted Corp',
  email: 'upserted@corp.com',
});
```

**Common record types:** `customer`, `invoice`, `salesorder`, `purchaseorder`, `vendor`, `employee`, `contact`, `item`, `transaction`, `journalentry`, `creditmemo`, `vendorbill`, and [any other NetSuite record type](https://system.netsuite.com/help/helpcenter/en_US/APIs/REST_API_Browser/record/v1/2024.2/index.html).

## RESTlets

Call custom server-side scripts deployed as RESTlets:

```ts
// GET request to a RESTlet
const result = await client.restlets.call<{ customers: Customer[] }>(
  { script: '100', deploy: '1', params: { action: 'search', limit: '50' } },
);

// POST request with a body
const created = await client.restlets.call<{ success: boolean }>(
  { script: '100', deploy: '1' },
  { method: 'POST', body: { type: 'customer', data: { name: 'Acme' } } },
);
```

## Raw HTTP

Escape hatch for any NetSuite REST endpoint not covered by the higher-level clients:

```ts
// All methods are available with full typing
const res = await client.get<MyType>(url);
const res = await client.post<MyType>(url, body);
const res = await client.put<MyType>(url, body);
const res = await client.patch<MyType>(url, body);
const res = await client.delete(url);

// Or use the generic request method
const res = await client.request<MyType>(url, {
  method: 'POST',
  body: { key: 'value' },
  headers: { 'X-Custom': 'header' },
  timeout: 60000,
});
```

Every response includes:

```ts
res.data;     // T — parsed response body
res.status;   // number — HTTP status code
res.headers;  // Record<string, string>
res.duration; // number — round-trip time in ms
```

## Middleware

The middleware pipeline lets you intercept every request and response. Middleware functions receive a `RequestContext` and a `next()` function that calls the next middleware (or the actual HTTP request):

```ts
import type { Middleware } from 'netsuite-sdk';

// Logging
client.use(async (ctx, next) => {
  const start = Date.now();
  console.log(`→ ${ctx.method} ${ctx.url}`);
  const res = await next();
  console.log(`← ${res.status} in ${res.duration}ms`);
  return res;
});

// Custom headers
client.use(async (ctx, next) => {
  ctx.headers['X-Request-Id'] = crypto.randomUUID();
  return next();
});
```

Middleware is called in the order added. Chain `.use()` calls:

```ts
client
  .use(loggingMiddleware)
  .use(cachingMiddleware)
  .use(rateLimitMiddleware);
```

### Caching middleware example

```ts
import { ResponseCache, createCacheKey } from 'netsuite-sdk';

const cache = new ResponseCache();

client.use(async (ctx, next) => {
  if (ctx.method !== 'GET') return next();

  const key = createCacheKey(ctx.url, ctx.method);
  const cached = cache.get(key);
  if (cached) return cached;

  const res = await next();
  cache.set(key, res, 300); // cache for 5 minutes
  return res;
});
```

### Rate limiting middleware example

```ts
import { RateLimiter } from 'netsuite-sdk';

const limiter = new RateLimiter(10, 1000); // 10 requests per second

client.use(async (ctx, next) => {
  const wait = limiter.getTimeUntilNextSlot();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  limiter.recordRequest();
  return next();
});
```

**`RequestContext`** properties available in middleware:

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | Full request URL |
| `method` | `HttpMethod` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `headers` | `Record<string, string>` | Mutable headers — modify before calling `next()` |
| `body` | `unknown` | Request body (for POST/PUT/PATCH) |
| `metadata` | `Record<string, unknown>` | Arbitrary data shared between middleware |

## Error Handling

All non-2xx responses throw a `NetSuiteError` with structured fields for programmatic handling:

```ts
import { NetSuiteError } from 'netsuite-sdk';

try {
  await client.records.get('customer', 999999);
} catch (error) {
  if (NetSuiteError.isNetSuiteError(error)) {
    console.error(`[${error.code}] ${error.message}`);
    // → [RCRD_DSNT_EXIST] That record does not exist.

    error.status;        // 404
    error.code;          // "RCRD_DSNT_EXIST"
    error.message;       // "That record does not exist."
    error.details;       // Full NetSuite error response body
    error.requestUrl;    // URL that was called
    error.requestMethod; // "GET"
    error.isRetryable;   // false (only true for 5xx, timeout, network errors)
    error.isAuthError;   // false (only true for 401, 403)
  }
}
```

**Retry behavior:**

| Scenario | Retried? | Details |
|----------|----------|---------|
| 5xx server errors | Yes | Retried up to `maxRetries` times |
| Timeouts | Yes | Treated as transient |
| Network errors | Yes | Connection failures, DNS issues, etc. |
| 4xx client errors | No | Bad request, not found, validation errors |
| 401 / 403 auth errors | No | Thrown immediately |

- OAuth is **re-signed on each retry** with a fresh nonce and timestamp
- Backoff uses **exponential delay** (1s → 2s → 4s → ...) with **jitter** (+/- 25%) to prevent thundering herd
- Max delay is capped at 30 seconds

## Configuration

```ts
const client = new NetSuiteClient({
  // Required
  auth: {
    consumerKey: '...',     // OAuth Consumer Key / Client ID
    consumerSecret: '...',  // OAuth Consumer Secret / Client Secret
    tokenKey: '...',        // OAuth Token ID
    tokenSecret: '...',     // OAuth Token Secret
    realm: '...',           // Account ID (same as accountId)
  },
  accountId: '1234567',     // NetSuite account ID

  // Optional (shown with defaults)
  timeout: 30000,           // Request timeout in ms
  maxRetries: 3,            // Max retry attempts for transient errors
  retryDelay: 1000,         // Initial retry delay in ms (doubles each attempt)
  defaultHeaders: {},       // Headers added to every request
  logger: undefined,        // Logger with debug/info/warn/error methods
});
```

### Environment variables

Store credentials securely using environment variables:

```bash
# .env
NS_ACCOUNT_ID=1234567
NS_CONSUMER_KEY=abc123...
NS_CONSUMER_SECRET=def456...
NS_TOKEN_KEY=ghi789...
NS_TOKEN_SECRET=jkl012...
```

```ts
import 'dotenv/config';
import { NetSuiteClient } from 'netsuite-sdk';

const client = new NetSuiteClient({
  auth: {
    consumerKey: process.env.NS_CONSUMER_KEY!,
    consumerSecret: process.env.NS_CONSUMER_SECRET!,
    tokenKey: process.env.NS_TOKEN_KEY!,
    tokenSecret: process.env.NS_TOKEN_SECRET!,
    realm: process.env.NS_ACCOUNT_ID!,
  },
  accountId: process.env.NS_ACCOUNT_ID!,
});
```

### Logger integration

Pass any logger that implements `debug`, `info`, `warn`, `error`:

```ts
// Works with pino, winston, console, or any compatible logger
import pino from 'pino';

const client = new NetSuiteClient({
  // ...auth config
  logger: pino(), // Automatically logs requests, responses, and retries
});
```

## Utilities

The SDK exports several standalone utilities you can use independently:

### ResponseCache

TTL-based in-memory cache:

```ts
import { ResponseCache, createCacheKey } from 'netsuite-sdk';

const cache = new ResponseCache();
cache.set('key', data, 300);           // cache for 300 seconds
const hit = cache.get<MyType>('key');  // MyType | null
cache.delete('key');
cache.clear();
cache.size;                            // number of entries

// Generate keys from request params
const key = createCacheKey(url, 'GET', { limit: 10 });
```

### RateLimiter

Sliding-window rate limiter:

```ts
import { RateLimiter } from 'netsuite-sdk';

const limiter = new RateLimiter(100, 60_000); // 100 requests per 60s

limiter.canMakeRequest();       // boolean — check before making a request
limiter.recordRequest();        // track a request
limiter.getRemainingRequests(); // slots left in current window
limiter.getTimeUntilNextSlot(); // ms until a slot opens (0 if available)
```

### Other utilities

```ts
import {
  validateConfig,       // Validate NetSuiteConfig, returns string[] of error messages
  formatNetSuiteDate,   // Date → NetSuite date string
  parseNetSuiteDate,    // NetSuite date string → Date
  parseNetSuiteError,   // Parse raw error response bodies
  normalizeAccountId,   // "1234567_SB1" → "1234567-sb1"
} from 'netsuite-sdk';
```

## Architecture

```
NetSuiteClient (facade)
├── SuiteQLClient      → POST /services/rest/query/v1/suiteql
├── RecordClient       → /services/rest/record/v1/{type}
├── RestletClient      → /app/site/hosting/restlet.nl
└── HttpTransport
    ├── OAuth 1.0a signing (HMAC-SHA256, fresh nonce per request)
    ├── Middleware pipeline (composable request/response hooks)
    └── Retry engine (exponential backoff + jitter)
```

**Key design decisions:**

- **OAuth re-signing on retry** — Each retry attempt generates a fresh nonce and timestamp. Many other NetSuite libraries sign once and reuse stale auth headers, causing retries to fail with 401.
- **All non-2xx throw** — No silent 4xx swallowing. Every non-success response is a `NetSuiteError` with structured properties for programmatic handling.
- **Library-agnostic middleware** — The `RequestContext` / `ResponseContext` types are decoupled from axios internals, so middleware you write won't break if the transport layer changes in a future version.
- **Auto-pagination** — SuiteQL `query()` handles offset tracking and page assembly internally. You get back a single array of all results.

## Requirements

- **Node.js** >= 20
- A **NetSuite account** with [Token-Based Authentication (TBA)](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4247226131.html) enabled
- An **integration record** in NetSuite with consumer key/secret
- A **token** (token key/secret) created for a user/role with appropriate permissions

### Setting up TBA in NetSuite

1. **Enable TBA**: Setup → Company → Enable Features → SuiteCloud → Manage Authentication → Token-Based Authentication
2. **Create an Integration**: Setup → Integration → Manage Integrations → New → enable Token-Based Authentication, set callback URL, copy consumer key/secret
3. **Create a Token**: Setup → Users/Roles → Access Tokens → New → select the integration, user, and role, copy token ID/secret

## Contributing

```bash
git clone https://github.com/dturton/netsuite-sdk.git
cd netsuite-sdk
npm install

npm test          # run all 113 tests
npm run build     # build CJS + ESM + .d.ts
npm run typecheck # type-check without emitting
npm run dev       # watch mode (rebuilds on change)
```

## License

[MIT](LICENSE)
