<div align="center">
  <img src="https://docs.hlquery.com/img/hlquery/2.png" alt="hlquery logo" width="200">
</div>

<div align="center">

**A typed TypeScript client library for hlquery, designed with a familiar modular API structure.**

[![Follow hlquery](https://img.shields.io/badge/Follow-%40hlquery-blue?logo=x&logoColor=white&labelColor=000000)](https://x.com/hlquery)
[![TypeScript build](https://img.shields.io/badge/TypeScript%20build-passing-brightgreen?logo=typescript&logoColor=white&labelColor=000000)](https://github.com/hlquery/type-api/actions/workflows/ci.yml)
[![type-api](https://img.shields.io/badge/GitHub-type--api-purple?logo=github&logoColor=white&labelColor=000000)](https://github.com/hlquery/type-api/)
[![hlquery](https://img.shields.io/badge/GitHub-hlquery-blue?logo=github&logoColor=white&labelColor=000000)](https://github.com/hlquery/hlquery/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-a35a0f?logo=open-source-initiative&logoColor=white&labelColor=000000)](https://opensource.org/licenses/BSD-3-Clause)

</div>

### What is the hlquery TypeScript API?

The hlquery TypeScript API is the official TypeScript client for [hlquery](https://github.com/hlquery/hlquery). It wraps the HTTP/JSON interface in typed classes so TypeScript and Node.js applications can work with hlquery without manually assembling URLs, request bodies, auth headers, and response parsing.

The library follows the same modular service layout as the JavaScript client: collections, documents, search, SQL, aliases, synonyms, stopwords, overrides, keys, and raw request access.

### Why use it?

Use the TypeScript API when you want hlquery integration to be explicit, typed, and easy to refactor. The client keeps common operations readable, centralizes auth handling, and gives editors and build tools useful method signatures for the hlquery API surface.

### Install

```bash
$ npm install hlquery-typescript-client
```

For local development inside this repository:

```bash
$ npm install
$ npm run build
$ npm test
```

### Quick Start

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

### Example: Index and Search

```ts
import Client from 'hlquery-typescript-client';

async function main(): Promise<void> {
  const client = new Client('http://localhost:9200');

  await client.collections().create('products', {
    fields: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'price', type: 'float' },
    ],
    searchable_fields: ['title', 'content'],
    filterable_fields: ['price'],
    sortable_fields: ['price'],
  });

  await client.documents().add('products', {
    id: 'product1',
    title: 'Laptop Computer',
    content: 'High-performance laptop with 16GB RAM',
    price: 1299.99,
  });

  const results = await client.search('products', {
    q: 'laptop',
    query_by: ['title', 'content'],
    limit: 10,
  });

  console.log(results.getBody());
}

main().catch(console.error);
```

### Contributing

We welcome contributions from the community! All contributions must be released under the BSD 3-Clause license.

### How to Contribute

- Check existing [TypeScript API issues](https://github.com/hlquery/type-api/issues) or create new ones
- Contribute TypeScript client changes to [hlquery/type-api](https://github.com/hlquery/type-api)
- Contribute shared server/API changes to [hlquery/hlquery](https://github.com/hlquery/hlquery)
- Test and report bugs against the TypeScript client
- Improve TypeScript-specific documentation and examples

### Community

- [Documentation](https://docs.hlquery.com)
- [X (Twitter)](https://x.com/hlquery)
- [TypeScript API GitHub](https://github.com/hlquery/type-api)
- [hlquery GitHub](https://github.com/hlquery/hlquery)

### License

The hlquery TypeScript API is licensed under the [BSD 3-Clause License](https://opensource.org/licenses/BSD-3-Clause).
