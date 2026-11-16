import type { APIResponse } from '@playwright/test';
import { test, expect } from '../../fixtures';
import { ProductsClient } from '../../clients/products.client';
import { buildProduct } from '../../data/product.data';
import { users } from '../../data/users';
import { expectError } from '../../support/assertions';
import { JWT_SECRET } from '../../support/env';
import { signToken, unsignedToken, withTamperedPayload } from '../../support/tokens';

// Auth runs before the lookup, so a nonexistent id is enough. If authorization were broken
// these calls would answer 404 and the test would fail without touching real data.
const MISSING_ID = 999_999_999;

const adminOnlyActions: Array<[string, (client: ProductsClient) => Promise<APIResponse>]> = [
  ['create', (client) => client.create(buildProduct())],
  ['replace', (client) => client.replace(MISSING_ID, buildProduct())],
  ['update', (client) => client.update(MISSING_ID, { stock: 1 })],
  ['delete', (client) => client.remove(MISSING_ID)],
];

test.describe('role-based access', { tag: '@security' }, () => {
  for (const [action, call] of adminOnlyActions) {
    test(`${action} without a token is 401`, async ({ anonymous }) => {
      await expectError(await call(anonymous), 401, 'UNAUTHORIZED');
    });

    test(`${action} as a customer is 403`, async ({ asCustomer }) => {
      await expectError(await call(asCustomer), 403, 'FORBIDDEN');
    });
  }

  test('reads are public for anonymous users and customers', async ({ anonymous, asCustomer }) => {
    expect((await anonymous.list({ limit: 1 })).status()).toBe(200);
    expect((await asCustomer.list({ limit: 1 })).status()).toBe(200);
  });
});

test.describe('bearer token handling', { tag: '@security' }, () => {
  const claims = { sub: '1', role: 'admin', email: users.admin.email };

  const createWith = (token: string, request: ConstructorParameters<typeof ProductsClient>[0]) =>
    new ProductsClient(request, token).create(buildProduct());

  test('token with a rewritten role is rejected rather than downgraded', async ({ request, tokens }) => {
    const forged = withTamperedPayload(tokens.customer, { role: 'admin' });

    await expectError(await createWith(forged, request), 401, 'INVALID_TOKEN');
  });

  test('token signed with a different secret is rejected', async ({ request }) => {
    const forged = signToken({ ...claims }, 'a-completely-different-secret-of-32-chars!!');

    await expectError(await createWith(forged, request), 401, 'INVALID_TOKEN');
  });

  test('unsigned alg=none token is rejected', async ({ request }) => {
    await expectError(await createWith(unsignedToken(claims), request), 401, 'INVALID_TOKEN');
  });

  test('expired token is rejected', async ({ request }) => {
    test.skip(!JWT_SECRET, 'JWT_SECRET is not available to the test process');

    const expired = signToken({ ...claims, exp: Math.floor(Date.now() / 1000) - 60 }, JWT_SECRET as string);

    await expectError(await createWith(expired, request), 401, 'INVALID_TOKEN');
  });

  test('random string is rejected', async ({ request }) => {
    await expectError(await createWith('not.a.jwt', request), 401, 'INVALID_TOKEN');
  });

  const malformedHeaders = ['Basic dXNlcjpwYXNz', 'Bearer', 'Token abc.def.ghi'];

  for (const header of malformedHeaders) {
    test(`Authorization header "${header}" is treated as missing`, async ({ request }) => {
      const response = await request.post('/api/v1/products', {
        headers: { Authorization: header },
        data: buildProduct(),
      });

      await expectError(response, 401, 'UNAUTHORIZED');
    });
  }
});
