import { NetSuiteClient } from 'netsuite-sdk';

// Initialize the client with OAuth 1.0a (Token-Based Authentication)
const client = new NetSuiteClient({
  auth: {
    consumerKey: process.env.NS_CONSUMER_KEY!,
    consumerSecret: process.env.NS_CONSUMER_SECRET!,
    tokenKey: process.env.NS_TOKEN_KEY!,
    tokenSecret: process.env.NS_TOKEN_SECRET!,
    realm: process.env.NS_REALM!,
  },
  accountId: process.env.NS_ACCOUNT_ID!,
  timeout: 30000,
  maxRetries: 3,
});

// Add a logging middleware
client.use(async (ctx, next) => {
  console.log(`→ ${ctx.method} ${ctx.url}`);
  const res = await next();
  console.log(`← ${res.status} (${res.duration}ms)`);
  return res;
});

async function main() {
  // GET a customer record
  const customer = await client.records.get('customer', 123);
  console.log('Customer:', customer.data);

  // List invoices
  const invoices = await client.records.list('invoice', {
    limit: 10,
    fields: ['tranid', 'total', 'entity'],
  });
  console.log(`Found ${invoices.data.totalResults} invoices`);

  // Create a customer
  const newCustomer = await client.records.create('customer', {
    companyname: 'Acme Corp',
    email: 'info@acme.com',
  });
  console.log('Created customer:', newCustomer.data);

  // Update a customer
  await client.records.update('customer', 123, {
    email: 'updated@acme.com',
  });

  // Delete a customer
  await client.records.delete('customer', 999);

  // Call a RESTlet
  const restletResult = await client.restlets.call(
    { script: '100', deploy: '1', params: { action: 'getData' } },
    { method: 'POST', body: { filters: { type: 'customer' } } },
  );
  console.log('RESTlet result:', restletResult.data);

  // Raw HTTP escape hatch
  const raw = await client.get('https://1234567.suitetalk.api.netsuite.com/services/rest/record/v1/customer/123');
  console.log('Raw:', raw.data);
}

main().catch(console.error);
