import { NetSuiteClient, NetSuiteError } from 'netsuite-sdk';

const client = new NetSuiteClient({
  auth: {
    consumerKey: process.env.NS_CONSUMER_KEY!,
    consumerSecret: process.env.NS_CONSUMER_SECRET!,
    tokenKey: process.env.NS_TOKEN_KEY!,
    tokenSecret: process.env.NS_TOKEN_SECRET!,
    realm: process.env.NS_REALM!,
  },
  accountId: process.env.NS_ACCOUNT_ID!,
});

interface CustomerRecord {
  id: string;
  companyname: string;
  email?: string;
  phone?: string;
  subsidiary?: { id: string; refName: string };
}

async function main() {
  // --- Create a customer ---

  const created = await client.records.create<CustomerRecord>('customer', {
    companyname: 'Example Corp',
    email: 'hello@example.com',
    subsidiary: { id: '1' },
  });
  console.log('Created:', created.data);

  // --- Get with specific fields ---

  const customer = await client.records.get<CustomerRecord>('customer', 123, {
    fields: ['companyname', 'email', 'phone'],
  });
  console.log('Customer:', customer.data);

  // --- List with pagination ---

  const page1 = await client.records.list<CustomerRecord>('customer', {
    limit: 25,
    offset: 0,
    fields: ['companyname', 'email'],
  });
  console.log(`Page 1: ${page1.data.items.length} of ${page1.data.totalResults}`);

  // --- Partial update (PATCH) ---

  await client.records.update('customer', 123, {
    email: 'updated@example.com',
    phone: '+1-555-0123',
  });
  console.log('Updated customer 123');

  // --- Upsert via external ID ---

  await client.records.upsert('customer', 'externalId', 'CRM-12345', {
    companyname: 'Upserted Corp',
    email: 'upsert@example.com',
  });
  console.log('Upserted customer CRM-12345');

  // --- Error handling ---

  try {
    await client.records.get('customer', 999999);
  } catch (error) {
    if (error instanceof NetSuiteError) {
      console.log(`NetSuite error: ${error.message}`);
      console.log(`  Status: ${error.status}`);
      console.log(`  Code: ${error.code}`);
      console.log(`  Retryable: ${error.isRetryable}`);
      console.log(`  Auth error: ${error.isAuthError}`);

      if (error.details?.['o:errorDetails']) {
        for (const detail of error.details['o:errorDetails']) {
          console.log(`  Detail: ${detail.detail}`);
        }
      }
    }
  }

  // --- Delete ---

  await client.records.delete('customer', 123);
  console.log('Deleted customer 123');
}

main().catch(console.error);
