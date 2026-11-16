import { test, expect } from '../../fixtures';
import { expectError } from '../../support/assertions';
import { expectSchema } from '../../support/contract';

test.describe('GET /products/:id', () => {
  test('returns the requested product', { tag: ['@smoke', '@contract'] }, async ({ anonymous, productFactory }) => {
    const created = await productFactory.create();

    const response = await anonymous.get(created.id);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expectSchema('ProductResponse', body);
    expect(body.data).toEqual(created);
  });

  test('unknown id returns 404', { tag: '@negative' }, async ({ anonymous }) => {
    await expectError(await anonymous.get(999_999_999), 404, 'PRODUCT_NOT_FOUND');
  });

  const invalidIds = ['abc', '0', '-1', '1.5', '1e3', '1 OR 1=1', '99999999999999999999'];

  for (const id of invalidIds) {
    test(`id "${id}" is a validation error, not a server error`, { tag: '@negative' }, async ({ anonymous }) => {
      await expectError(await anonymous.get(id), 400, 'VALIDATION_ERROR');
    });
  }
});
