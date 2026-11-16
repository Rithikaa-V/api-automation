import { test, expect } from '../../fixtures';
import { expectError } from '../../support/assertions';
import { findProductRow } from '../../support/db';

test.describe('DELETE /products/:id', () => {
  test('removes the product', { tag: ['@smoke', '@regression'] }, async ({ asAdmin, anonymous, productFactory, db }) => {
    const product = await productFactory.create();

    const response = await asAdmin.remove(product.id);

    expect(response.status()).toBe(204);
    expect(await response.text()).toBe('');
    expect(await findProductRow(db, product.id)).toBeUndefined();
    await expectError(await anonymous.get(product.id), 404, 'PRODUCT_NOT_FOUND');
  });

  test('leaves other products alone', { tag: '@regression' }, async ({ asAdmin, anonymous, productFactory }) => {
    const doomed = await productFactory.create();
    const bystander = await productFactory.create();

    await asAdmin.remove(doomed.id);

    expect((await anonymous.get(bystander.id)).status()).toBe(200);
  });

  test('deleting twice returns 404 the second time', { tag: '@negative' }, async ({ asAdmin, productFactory }) => {
    const product = await productFactory.create();

    expect((await asAdmin.remove(product.id)).status()).toBe(204);
    await expectError(await asAdmin.remove(product.id), 404, 'PRODUCT_NOT_FOUND');
  });

  test('unknown id returns 404', { tag: '@negative' }, async ({ asAdmin }) => {
    await expectError(await asAdmin.remove(999_999_999), 404, 'PRODUCT_NOT_FOUND');
  });

  test('non-numeric id returns 400', { tag: '@negative' }, async ({ asAdmin }) => {
    await expectError(await asAdmin.remove('abc'), 400, 'VALIDATION_ERROR');
  });
});
