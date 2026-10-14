import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, saveResultQuery } from '../functions/results.mjs';

const request = (body, method = 'PUT') =>
  new Request('http://localhost/api/results', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const result = { matchId: '2615A1', homeGoals: 0, awayGoals: 0 };

test('saves valid results using parameters and returns the database confirmation', async () => {
  const handler = createHandler(async (query, params) => {
    assert.equal(query, saveResultQuery);
    assert.deepEqual(params, ['2615A1', 0, 0, 'csi-lodi-crema-open-m-gir-2026-2027']);
    return [result];
  });
  const response = await handler(request(result));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), result);
});

test('rejects invalid input without querying the database', async () => {
  const handler = createHandler(() => assert.fail('Should not query'));
  for (const value of [
    null,
    [],
    {},
    { ...result, matchId: '' },
    { ...result, homeGoals: -1 },
    { ...result, homeGoals: 1.5 },
    { ...result, awayGoals: '2' },
    { ...result, awayGoals: 2147483648 },
    { ...result, homeGoals: null },
  ]) {
    assert.equal((await handler(request(value))).status, 400);
  }
  assert.equal((await handler(request(result, 'POST'))).status, 405);
  assert.equal(
    (
      await handler(
        new Request('http://localhost/api/results', {
          method: 'PUT',
          body: '{}',
        }),
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await handler(
        new Request('http://localhost/api/results', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: '{broken',
        }),
      )
    ).status,
    400,
  );
  assert.equal((await handler(request({ ...result, extra: 'x'.repeat(1500) }))).status, 413);
});

test('does not create results for matches outside this championship or unknown matches', async () => {
  assert.equal((await createHandler(async () => [])(request(result))).status, 404);
});

test('reports database errors without leaking connection details', async () => {
  const logs = [];
  const handler = createHandler(
    async () => {
      throw new Error('private-credential');
    },
    (message) => logs.push(message),
  );
  const response = await handler(request(result));
  assert.equal(response.status, 503);
  assert.equal(logs.length, 1);
  assert.ok(!JSON.stringify(logs).includes('private-credential'));
  assert.ok(!(await response.text()).includes('private-credential'));
});
