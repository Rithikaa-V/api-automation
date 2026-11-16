import { test, expect } from '../fixtures';
import { expectSchema } from '../support/contract';

test('health endpoint reports ok', { tag: '@smoke' }, async ({ request }) => {
  const response = await request.get('/health');

  expect(response.status()).toBe(200);
  const body = await response.json();
  expectSchema('Health', body);
  expect(body).toEqual({ status: 'ok' });
});
