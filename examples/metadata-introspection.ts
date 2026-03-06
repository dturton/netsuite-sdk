import { NetSuiteClient } from 'netsuite-sdk';

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

async function main() {
  // List all available record types
  const catalog = await client.metadata.listRecordTypes();
  console.log(`Found ${catalog.data.items.length} record types:`);
  for (const entry of catalog.data.items) {
    console.log(`  - ${entry.name} (${entry.mediaType.join(', ')})`);
  }

  // List only specific record types
  const filtered = await client.metadata.listRecordTypes({
    select: ['customer', 'salesOrder', 'invoice'],
  });
  console.log('\nFiltered record types:', filtered.data.items.map((e) => e.name));

  // Get OpenAPI 3.0 spec for a specific record type
  const customerSpec = await client.metadata.getRecordMetadata('customer');
  console.log('\nCustomer OpenAPI spec:', JSON.stringify(customerSpec.data, null, 2));

  // Get JSON Schema for a record type
  const schema = await client.metadata.getRecordMetadata('salesOrder', {
    format: 'jsonschema',
  });
  console.log('\nSales Order JSON Schema:', JSON.stringify(schema.data, null, 2));

  // Get the full OpenAPI spec for selected record types
  const openapi = await client.metadata.getOpenApiSpec({
    select: ['customer', 'salesOrder'],
  });
  console.log('\nOpenAPI spec:', JSON.stringify(openapi.data, null, 2));
}

main().catch(console.error);
