import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, championshipQuery } from '../functions/championship.mjs';

const request = (method = 'GET') => new Request('http://localhost/api/championship', { method });

test('returns database data without caching, filtering by championship via a SQL parameter', async () => {
  const data = { teams: [], matches: [], results: [] };
  const handler = createHandler(async (sql, params) => {
    assert.equal(sql, championshipQuery);
    assert.deepEqual(params, ['csi-lodi-crema-open-m-gir-2026-2027']);
    return [{ data }];
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), data);
});

test('rejects writes before contacting the database', async () => {
  const handler = createHandler(() => assert.fail('Should not query'));
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const response = await handler(request(method));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET');
  }
});

test('reports missing championship, not an empty successful response', async () => {
  const response = await createHandler(async () => [])(request());
  assert.equal(response.status, 404);
});

test('reports database failures without exposing credentials or driver details', async () => {
  const logs = [];
  const handler = createHandler(
    async () => {
      throw new Error('postgresql://secret-password@private-host');
    },
    (message) => logs.push(message),
  );
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal(logs.length, 1);
  assert.ok(!JSON.stringify(logs).includes('secret-password'));
  assert.ok(!(await response.text()).includes('secret-password'));
});
