import { test, expect } from '../../fixtures';
import { buildProduct } from '../../data/product.data';
import { expectError } from '../../support/assertions';
import { expectSchema } from '../../support/contract';
import { findProductRow } from '../../support/db';
import type { Product } from '../../types';

const MISSING_ID = 999_999_999;

test.describe('PUT /products/:id', () => {
  test('replaces every field and keeps identity', { tag: ['@regression', '@contract'] }, async ({ asAdmin, productFactory, db }) => {
    const original = await productFactory.create();
    const replacement = buildProduct({ description: 'replaced', price: 41.25, stock: 4 });

    const response = await asAdmin.replace(original.id, replacement);

    expect(response.status(), await response.text()).toBe(200);
    const body = await response.json();
    expectSchema('ProductResponse', body);
    expect(body.data).toMatchObject({ id: original.id, created_at: original.created_at, ...replacement });
    expect(await findProductRow(db, original.id)).toEqual(replacement);
  });

  test('optional fields that are left out fall back to their defaults', { tag: '@regression' }, async ({ asAdmin, productFactory }) => {
    const original = await productFactory.create({ description: 'will be cleared', stock: 9 });

    const response = await asAdmin.replace(original.id, { name: original.name, price: original.price });

    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ description: '', stock: 0 });
  });

  test('requires the mandatory fields', { tag: '@negative' }, async ({ asAdmin, productFactory }) => {
    const original = await productFactory.create();

    await expectError(await asAdmin.replace(original.id, { name: original.name }), 400, 'VALIDATION_ERROR');
  });

  test('unknown id returns 404', { tag: '@negative' }, async ({ asAdmin }) => {
    await expectError(await asAdmin.replace(MISSING_ID, buildProduct()), 404, 'PRODUCT_NOT_FOUND');
  });

  test('non-numeric id returns 400', { tag: '@negative' }, async ({ asAdmin }) => {
    await expectError(await asAdmin.replace('abc', buildProduct()), 400, 'VALIDATION_ERROR');
  });
});

test.describe('PATCH /products/:id', () => {
  test('changes only the supplied field', { tag: ['@smoke', '@regression'] }, async ({ asAdmin, productFactory, db }) => {
    const original = await productFactory.create({ stock: 13 });

    const response = await asAdmin.update(original.id, { stock: 2 });

    expect(response.status(), await response.text()).toBe(200);
    const { data } = (await response.json()) as { data: Product };
    expect(data).toEqual({ ...original, stock: 2, updated_at: data.updated_at });
    expect(Date.parse(data.updated_at)).toBeGreaterThan(Date.parse(original.updated_at));
    expect(await findProductRow(db, original.id)).toMatchObject({ name: original.name, stock: 2 });
  });

  test('changes several fields at once', { tag: '@regression' }, async ({ asAdmin, productFactory }) => {
    const original = await productFactory.create();
    const changes = { price: 10.5, description: 'updated description' };

    const response = await asAdmin.update(original.id, changes);

    expect((await response.json()).data).toMatchObject({ ...changes, name: original.name, stock: original.stock });
  });

  // Guards against `value || existing` style bugs where a legitimate falsy value is ignored.
  const falsyValues: Array<[string, Partial<Product>]> = [
    ['a stock of 0', { stock: 0 }],
    ['a price of 0', { price: 0 }],
    ['an empty description', { description: '' }],
  ];

  for (const [description, changes] of falsyValues) {
    test(`applies ${description}`, { tag: '@regression' }, async ({ asAdmin, productFactory }) => {
      const original = await productFactory.create();

      const response = await asAdmin.update(original.id, changes);

      expect(response.status()).toBe(200);
      expect((await response.json()).data).toMatchObject(changes);
    });
  }

  const invalidPatches: Array<[string, unknown]> = [
    ['an empty body', {}],
    ['only unknown fields', { colour: 'red' }],
    ['a negative price', { price: -5 }],
    ['a one character name', { name: 'a' }],
    ['a fractional stock', { stock: 0.5 }],
  ];

  for (const [description, body] of invalidPatches) {
    test(`rejects ${description}`, { tag: '@negative' }, async ({ asAdmin, productFactory }) => {
      const original = await productFactory.create();

      await expectError(await asAdmin.update(original.id, body), 400, 'VALIDATION_ERROR');
    });
  }

  test('unknown id returns 404', { tag: '@negative' }, async ({ asAdmin }) => {
    await expectError(await asAdmin.update(MISSING_ID, { stock: 1 }), 404, 'PRODUCT_NOT_FOUND');
  });
});
