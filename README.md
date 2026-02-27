# netsuite-sdk

TypeScript-first NetSuite REST API client with first-class SuiteQL support, OAuth 1.0a authentication, automatic retries, and a fluent query builder.

## Features

- **SuiteQL** — `query()`, `queryOne()`, and `queryPages()` with auto-pagination
- **Fluent query builder** — type-safe SQL construction with value escaping
- **REST Record API** — full CRUD: `get`, `list`, `create`, `update`, `replace`, `delete`, `upsert`
- **RESTlet support** — auto-built URLs from script/deploy IDs
- **OAuth 1.0a (TBA)** — HMAC-SHA256 signing, fresh nonce on each retry
- **Automatic retries** — exponential backoff with jitter for 5xx/timeout/network errors
- **Middleware** — extensible request/response pipeline
- **TypeScript-first** — strict mode, full type inference, generics everywhere
- **Dual format** — ships both CJS and ESM with `.d.ts` declarations

## Install

```bash
npm install netsuite-sdk
```

## Quick Start

```ts
import { NetSuiteClient } from 'netsuite-sdk';

const client = new NetSuiteClient({
  auth: {
    consumerKey: 'your-consumer-key',
    consumerSecret: 'your-consumer-secret',
    tokenKey: 'your-token-key',
    tokenSecret: 'your-token-secret',
    realm: 'your-account-id',
  },
  accountId: 'your-account-id', // e.g., "1234567" or "1234567_SB1" for sandbox
});
```

## SuiteQL

### Raw SQL queries

```ts
interface Customer {
  id: string;
  companyname: string;
  email: string;
}

// Auto-paginates and returns all rows
const result = await client.suiteql.query<Customer>(
  "SELECT id, companyname, email FROM customer WHERE isinactive = 'F'"
);

console.log(result.items);        // Customer[]
console.log(result.totalResults); // total count from NetSuite
console.log(result.pagesFetched); // number of API calls made
console.log(result.duration);     // total ms
```

### Get a single row

```ts
const customer = await client.suiteql.queryOne<Customer>(
  'SELECT id, companyname FROM customer WHERE id = 123'
);
// Returns Customer | null
```

### Stream large result sets

```ts
for await (const page of client.suiteql.queryPages<Customer>(
  'SELECT id, companyname FROM customer',
  { pageSize: 500 }
)) {
  await processBatch(page); // page is Customer[]
}
```

### Query builder

```ts
import { suiteql } from 'netsuite-sdk';

const sql = suiteql()
  .select('c.id', 'c.companyname', 'COUNT(t.id) AS order_count')
  .from('customer', 'c')
  .leftJoin('transaction t', 'c.id = t.entity')
  .whereEquals('c.isinactive', false)  // false → 'F' automatically
  .whereNotNull('c.email')
  .whereIn('c.subsidiary', [1, 2, 3])
  .groupBy('c.id', 'c.companyname')
  .having('COUNT(t.id) > 0')
  .orderBy('order_count', 'DESC')
  .build();

const result = await client.suiteql.query(sql);
```

Builder methods: `select()`, `from()`, `join()`, `leftJoin()`, `rightJoin()`, `where()`, `whereEquals()`, `whereNotEquals()`, `whereIn()`, `whereNull()`, `whereNotNull()`, `whereBetween()`, `whereLike()`, `groupBy()`, `having()`, `orderBy()`.

String values are automatically escaped (single quotes doubled).

### SuiteQL Options

```ts
await client.suiteql.query(sql, {
  pageSize: 500,      // rows per page (default: 1000, max: 1000)
  offset: 0,          // starting offset (default: 0)
  maxRows: 10000,     // cap total rows fetched (default: Infinity)
  timeout: 60000,     // override timeout for this query
});
```

## REST Record API

```ts
// Get a record
const customer = await client.records.get('customer', 123, {
  fields: ['companyname', 'email'],
  expandSubResources: true,
});

// List records
const list = await client.records.list('invoice', {
  limit: 25,
  offset: 0,
  fields: ['tranid', 'total'],
});

// Create
await client.records.create('customer', {
  companyname: 'Acme Corp',
  email: 'info@acme.com',
});

// Update (PATCH — partial)
await client.records.update('customer', 123, { email: 'new@acme.com' });

// Replace (PUT — full)
await client.records.replace('customer', 123, { companyname: 'New Name' });

// Delete
await client.records.delete('customer', 123);

// Upsert via external ID
await client.records.upsert('customer', 'externalId', 'CRM-001', {
  companyname: 'Upserted Corp',
});
```

## RESTlets

```ts
const result = await client.restlets.call(
  { script: '100', deploy: '1', params: { action: 'search' } },
  { method: 'POST', body: { type: 'customer' } }
);
```

## Raw HTTP

Escape hatch for custom endpoints:

```ts
const res = await client.get<MyType>('https://1234567.suitetalk.api.netsuite.com/custom/endpoint');
const res = await client.post<MyType>(url, body);
const res = await client.put<MyType>(url, body);
const res = await client.patch<MyType>(url, body);
const res = await client.delete(url);
```

## Middleware

```ts
// Logging middleware
client.use(async (ctx, next) => {
  console.log(`→ ${ctx.method} ${ctx.url}`);
  const res = await next();
  console.log(`← ${res.status} (${res.duration}ms)`);
  return res;
});

// Custom header injection
client.use(async (ctx, next) => {
  ctx.headers['X-Custom-Header'] = 'value';
  return next();
});
```

## Error Handling

```ts
import { NetSuiteError } from 'netsuite-sdk';

try {
  await client.records.get('customer', 999);
} catch (error) {
  if (error instanceof NetSuiteError) {
    error.status;        // HTTP status code
    error.code;          // NetSuite error code (e.g., "RCRD_DSNT_EXIST")
    error.message;       // Human-readable message
    error.details;       // Full NetSuite error response body
    error.requestUrl;    // URL that failed
    error.requestMethod; // HTTP method that failed
    error.isRetryable;   // true for 5xx, timeout, network errors
    error.isAuthError;   // true for 401, 403
  }
}
```

## Configuration

```ts
const client = new NetSuiteClient({
  auth: {
    consumerKey: '...',
    consumerSecret: '...',
    tokenKey: '...',
    tokenSecret: '...',
    realm: '...',
  },
  accountId: '1234567',     // or "1234567_SB1" for sandbox
  timeout: 30000,           // request timeout in ms (default: 30000)
  maxRetries: 3,            // retry attempts for transient errors (default: 3)
  retryDelay: 1000,         // initial retry delay in ms (default: 1000)
  defaultHeaders: {         // headers added to every request
    'X-App-Name': 'my-app',
  },
  logger: console,          // any object with debug/info/warn/error methods
});
```

## Utilities

```ts
import {
  ResponseCache,
  createCacheKey,
  RateLimiter,
  validateConfig,
  formatNetSuiteDate,
  parseNetSuiteDate,
  parseNetSuiteError,
  normalizeAccountId,
} from 'netsuite-sdk';
```

## Requirements

- Node.js >= 20
- NetSuite account with Token-Based Authentication (TBA) enabled

## License

MIT
