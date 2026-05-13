import Client from '../src';

async function main(): Promise<void> {
  const client = new Client(process.env.HLQ_BASE_URL || process.env.HLQUERY_BASE_URL || 'http://localhost:9200', {
    token: process.env.HLQ_TOKEN || null,
    auth_method: 'bearer',
  });

  const health = await client.health();
  console.log('status:', health.getStatusCode());

  const collections = await client.collections().list(0, 10);
  console.log(collections.getBody());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
