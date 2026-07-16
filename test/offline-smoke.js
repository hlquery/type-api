const assert = require('assert');
const hlquery = require('../dist');

assert.strictEqual(typeof hlquery, 'function');
assert.strictEqual(typeof hlquery.Client, 'function');

const client = new hlquery.Client('localhost:9200', {
  token: 'token',
  auth_method: 'api-key',
});

assert.strictEqual(typeof client.collections().list, 'function');
assert.strictEqual(typeof client.documents().add, 'function');
assert.strictEqual(typeof client.searchApi().vectorSearch, 'function');
assert.strictEqual(typeof client.searchApi().searchAll, 'function');
assert.strictEqual(typeof client.searchAll, 'function');
assert.strictEqual(typeof client.sql, 'function');
assert.strictEqual(typeof client.execSql, 'function');
assert.strictEqual(typeof client.sqlSearch, 'function');
assert.strictEqual(typeof client.configFiles, 'function');
assert.strictEqual(typeof client.cache, 'function');
assert.strictEqual(typeof client.debugCounters, 'function');
assert.strictEqual(typeof client.presets().list, 'function');
assert.strictEqual(typeof client.presets().update, 'function');

const response = new hlquery.Response(200, { ok: true });
assert.strictEqual(response.isSuccess(), true);
assert.deepStrictEqual(response.toArray(), { status: 200, body: { ok: true } });

assert.throws(() => hlquery.Validator.validateCollectionName('1bad'), /must start/);

console.log('offline smoke ok');
