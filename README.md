<div align="center">
  <img src="https://docs.hlquery.com/img/hlquery/2.png" alt="hlquery logo" width="200">
</div>

### hlquery TypeScript API

TypeScript client library for hlquery, modeled after the JavaScript client in `etc/api/node`.

It exposes the same modular shape:

```ts
import Client from 'hlquery-typescript-client';

const client = new Client(process.env.HLQ_BASE_URL || 'http://localhost:9200', {
  token: process.env.HLQ_TOKEN,
  auth_method: 'bearer',
});

const health = await client.health();
const collections = await client.collections().list(0, 10);

console.log(health.getStatusCode());
console.log(collections.getBody());
```

### Local Development

```bash
npm install
npm run build
npm test
```

### API Shape

- `client.collections()`
- `client.documents()`
- `client.searchApi()`
- `client.system()`
- `client.sam()`
- `client.keys()`
- `client.aliases()`
- `client.synonyms()`
- `client.stopwords()`
- `client.overrides()`
- `client.executeRequest(method, path, body, queryParams)`

The package compiles to CommonJS and emits TypeScript declarations in `dist/`.
