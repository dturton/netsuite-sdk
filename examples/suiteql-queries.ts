import { NetSuiteClient, suiteql } from 'netsuite-sdk';

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

// Define types for your results
interface Customer {
  id: string;
  companyname: string;
  email: string;
}

interface TransactionSummary {
  entity: string;
  companyname: string;
  total_orders: string;
  total_amount: string;
}

async function main() {
  // --- Raw SQL string ---

  const result = await client.suiteql.query<Customer>(
    "SELECT id, companyname, email FROM customer WHERE isinactive = 'F' AND email IS NOT NULL",
  );
  console.log(`Found ${result.totalResults} active customers with email`);
  console.log(`Fetched ${result.items.length} rows in ${result.pagesFetched} pages (${result.duration}ms)`);

  // --- Query builder ---

  const sql = suiteql()
    .select('t.entity', 'c.companyname', 'COUNT(t.id) AS total_orders', 'SUM(t.total) AS total_amount')
    .from('transaction', 't')
    .join('customer c', 't.entity = c.id')
    .whereEquals('t.type', 'SalesOrd')
    .whereNotNull('t.entity')
    .groupBy('t.entity', 'c.companyname')
    .having('COUNT(t.id) > 5')
    .orderBy('total_amount', 'DESC')
    .build();

  console.log('Generated SQL:', sql);

  const topCustomers = await client.suiteql.query<TransactionSummary>(sql);
  for (const row of topCustomers.items) {
    console.log(`${row.companyname}: ${row.total_orders} orders, $${row.total_amount}`);
  }

  // --- Get a single row ---

  const customer = await client.suiteql.queryOne<Customer>(
    "SELECT id, companyname, email FROM customer WHERE id = 123",
  );
  if (customer) {
    console.log(`Customer 123: ${customer.companyname}`);
  } else {
    console.log('Customer 123 not found');
  }

  // --- Stream large result sets page by page ---

  let totalProcessed = 0;
  for await (const page of client.suiteql.queryPages<Customer>(
    "SELECT id, companyname, email FROM customer",
    { pageSize: 500 },
  )) {
    totalProcessed += page.length;
    console.log(`Processing batch of ${page.length} customers (total: ${totalProcessed})`);
    // Process each page without holding all results in memory
  }

  // --- With maxRows to cap results ---

  const limited = await client.suiteql.query<Customer>(
    "SELECT id, companyname FROM customer",
    { maxRows: 100 },
  );
  console.log(`Got ${limited.items.length} of ${limited.totalResults} total`);
  console.log(`Has more: ${limited.hasMore}`);
}

main().catch(console.error);
