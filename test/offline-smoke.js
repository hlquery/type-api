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
assert.strictEqual(typeof client.sam().search, 'function');
assert.strictEqual(typeof client.sam().searchAll, 'function');
assert.strictEqual(typeof client.sam().rebuild, 'function');
assert.strictEqual(typeof client.sam().status, 'function');
assert.strictEqual(typeof client.sam().debug, 'function');
assert.strictEqual(typeof client.sam().history, 'function');
assert.strictEqual(typeof client.sam().pause, 'function');
assert.strictEqual(typeof client.sam().clearPause, 'function');
assert.strictEqual(typeof client.sam().listDocuments, 'function');
assert.strictEqual(typeof client.sam().getDocument, 'function');
assert.strictEqual(typeof client.sam().openDocument, 'function');
assert.strictEqual(typeof client.sql, 'function');
assert.strictEqual(typeof client.execSql, 'function');
assert.strictEqual(typeof client.sqlSearch, 'function');

const response = new hlquery.Response(200, { ok: true });
assert.strictEqual(response.isSuccess(), true);
assert.deepStrictEqual(response.toArray(), { status: 200, body: { ok: true } });

assert.throws(() => hlquery.Validator.validateCollectionName('1bad'), /must start/);

console.log('offline smoke ok');
