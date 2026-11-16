import { test, expect } from '../fixtures';
import { buildProduct } from '../data/product.data';
import { expectError } from '../support/assertions';

test.describe('response hardening', { tag: '@security' }, () => {
  test('unknown route returns a JSON 404 and hides the framework', async ({ request }) => {
    const response = await request.get('/route-that-does-not-exist');

    await expectError(response, 404, 'ROUTE_NOT_FOUND');
    expect(response.headers()['x-powered-by']).toBeUndefined();
  });

  test('standard security headers are present', async ({ request }) => {
    const headers = (await request.get('/health')).headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();
  });

  test('cross-origin requests are not granted CORS access', async ({ request }) => {
    const response = await request.get('/api/v1/products', { headers: { Origin: 'https://evil.example' } });

    expect(response.headers()['access-control-allow-origin']).toBeUndefined();
  });
});

test.describe('malformed requests', { tag: ['@security', '@negative'] }, () => {
  test('invalid JSON returns 400', async ({ request, tokens }) => {
    const response = await request.post('/api/v1/products', {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.admin}` },
      data: '{"name": "broken", ',
    });

    await expectError(response, 400, 'INVALID_JSON');
  });

  test('body over the size limit returns 413', async ({ asAdmin }) => {
    const response = await asAdmin.create(buildProduct({ description: 'x'.repeat(150_000) }));

    await expectError(response, 413, 'PAYLOAD_TOO_LARGE');
  });

  test('non-JSON content type is handled as an empty body', async ({ request, tokens }) => {
    const response = await request.post('/api/v1/products', {
      headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${tokens.admin}` },
      data: 'name=widget',
    });

    await expectError(response, 400, 'VALIDATION_ERROR');
  });
});
