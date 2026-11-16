import { test, expect } from '../../fixtures';
import { buildProduct, TEST_PRODUCT_PREFIX } from '../../data/product.data';
import { expectError } from '../../support/assertions';
import { expectSchema } from '../../support/contract';
import { countProductsNamed, findProductRow } from '../../support/db';
import type { Product } from '../../types';

test.describe('POST /products', () => {
  test('creates a product and persists it', { tag: ['@smoke', '@contract'] }, async ({ asAdmin, productFactory, db }) => {
    const payload = buildProduct();

    const response = await asAdmin.create(payload);

    expect(response.status(), await response.text()).toBe(201);
    const body = await response.json();
    productFactory.track(body.data.id);
    expectSchema('ProductResponse', body);
    expect(body.data).toMatchObject({ ...payload });
    expect(response.headers().location).toBe(`/api/v1/products/${body.data.id}`);
    expect(await findProductRow(db, body.data.id)).toEqual(payload);
  });

  test('description and stock default to empty and zero', { tag: '@regression' }, async ({ asAdmin, productFactory }) => {
    const { name, price } = buildProduct();

    const response = await asAdmin.create({ name, price });

    expect(response.status(), await response.text()).toBe(201);
    const { data } = (await response.json()) as { data: Product };
    productFactory.track(data.id);
    expect(data).toMatchObject({ name, price, description: '', stock: 0 });
  });

  test('trims surrounding whitespace from the name', { tag: '@regression' }, async ({ asAdmin, productFactory }) => {
    const { name } = buildProduct();

    const response = await asAdmin.create(buildProduct({ name: `  ${name}  ` }));

    expect(response.status()).toBe(201);
    const { data } = (await response.json()) as { data: Product };
    productFactory.track(data.id);
    expect(data.name).toBe(name);
  });

  const boundaries: Array<[string, Parameters<typeof buildProduct>[0]]> = [
    ['a name of exactly 120 characters', { name: `${TEST_PRODUCT_PREFIX}-`.padEnd(120, 'x') }],
    ['a description of exactly 2000 characters', { description: 'd'.repeat(2000) }],
    ['a price of 0', { price: 0 }],
    ['the highest price the column allows', { price: 99_999_999.99 }],
    ['a stock of 0', { stock: 0 }],
    ['the highest stock the column allows', { stock: 2_147_483_647 }],
  ];

  for (const [description, overrides] of boundaries) {
    test(`accepts ${description}`, { tag: '@regression' }, async ({ asAdmin, productFactory, db }) => {
      const payload = buildProduct(overrides);

      const response = await asAdmin.create(payload);

      expect(response.status(), await response.text()).toBe(201);
      const { data } = (await response.json()) as { data: Product };
      productFactory.track(data.id);
      expect(await findProductRow(db, data.id)).toEqual(payload);
    });
  }

  const withoutField = (field: 'name' | 'price') => {
    const copy: Record<string, unknown> = { ...buildProduct() };
    delete copy[field];
    return copy;
  };

  const invalidPayloads: Array<[string, unknown]> = [
    ['a missing name', withoutField('name')],
    ['a one character name', buildProduct({ name: 'a' })],
    ['a name over 120 characters', buildProduct({ name: 'n'.repeat(121) })],
    ['a whitespace-only name', buildProduct({ name: '     ' })],
    ['a numeric name', { ...buildProduct(), name: 12345 }],
    ['a missing price', withoutField('price')],
    ['a negative price', buildProduct({ price: -0.01 })],
    ['a string price', { ...buildProduct(), price: '29.95' }],
    ['a price with three decimals', buildProduct({ price: 1.005 })],
    ['a price over the column limit', buildProduct({ price: 100_000_000 })],
    ['a negative stock', buildProduct({ stock: -1 })],
    ['a fractional stock', buildProduct({ stock: 1.5 })],
    ['a stock over the INTEGER range', buildProduct({ stock: 2_147_483_648 })],
    ['a string stock', { ...buildProduct(), stock: '5' }],
    ['a description over 2000 characters', buildProduct({ description: 'd'.repeat(2001) })],
    ['an array instead of an object', []],
  ];

  for (const [description, payload] of invalidPayloads) {
    test(`rejects ${description}`, { tag: '@negative' }, async ({ asAdmin }) => {
      await expectError(await asAdmin.create(payload), 400, 'VALIDATION_ERROR');
    });
  }

  test('a rejected request does not leave a row behind', { tag: '@negative' }, async ({ asAdmin, db }) => {
    const payload = buildProduct({ price: -1 });

    await expectError(await asAdmin.create(payload), 400, 'VALIDATION_ERROR');

    expect(await countProductsNamed(db, payload.name)).toBe(0);
  });

  test('server-controlled fields in the body are ignored', { tag: '@security' }, async ({ asAdmin, productFactory }) => {
    const response = await asAdmin.create({
      ...buildProduct(),
      id: 987_654_321,
      created_by: 1,
      created_at: '2001-01-01T00:00:00Z',
    });

    expect(response.status(), await response.text()).toBe(201);
    const body = await response.json();
    productFactory.track(body.data.id);
    expectSchema('ProductResponse', body);
    expect(body.data.id).not.toBe(987_654_321);
    expect(new Date(body.data.created_at).getFullYear()).toBeGreaterThan(2001);
  });

  const awkwardNames = [`O'Brien "quoted"`, `Robert'); DROP TABLE products;--`, '商品 ✓'];

  for (const suffix of awkwardNames) {
    test(`stores the name ${JSON.stringify(suffix)} verbatim`, { tag: '@security' }, async ({ anonymous, productFactory }) => {
      const name = `${buildProduct().name} ${suffix}`;

      const created = await productFactory.create({ name });
      const fetched = await (await anonymous.get(created.id)).json();

      expect(fetched.data.name).toBe(name);
      expect((await anonymous.list({ limit: 1 })).status()).toBe(200);
    });
  }

  test('parallel creates all succeed with distinct ids', { tag: '@regression' }, async ({ asAdmin, productFactory }) => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => asAdmin.create(buildProduct())));

    const ids: number[] = [];
    for (const response of responses) {
      expect(response.status(), await response.text()).toBe(201);
      const { data } = (await response.json()) as { data: Product };
      productFactory.track(data.id);
      ids.push(data.id);
    }
    expect(new Set(ids).size).toBe(5);
  });
});
