import { test, expect } from '../../fixtures';
import type { ProductsClient } from '../../clients/products.client';
import { seedProducts } from '../../data/seed';
import { expectError } from '../../support/assertions';
import { expectSchema } from '../../support/contract';
import type { ProductList } from '../../types';

test.describe('GET /products', () => {
  test('returns the first page with pagination metadata', { tag: ['@smoke', '@contract'] }, async ({ anonymous }) => {
    const response = await anonymous.list();

    expect(response.status()).toBe(200);
    const body = (await response.json()) as ProductList;
    expectSchema('ProductList', body);
    expect(body.pagination).toMatchObject({ limit: 20, offset: 0 });
    expect(body.pagination.total).toBeGreaterThanOrEqual(seedProducts.length);
    expect(body.data.length).toBeGreaterThanOrEqual(Math.min(20, seedProducts.length));
    expect(body.data.length).toBeLessThanOrEqual(20);
  });

  test('limit and offset select consecutive, id-ordered pages', { tag: '@regression' }, async ({ anonymous }) => {
    const first = (await (await anonymous.list({ limit: 5, offset: 0 })).json()) as ProductList;
    const second = (await (await anonymous.list({ limit: 5, offset: 5 })).json()) as ProductList;

    expect(first.data).toHaveLength(5);
    expect(second.data).toHaveLength(5);
    expect(second.pagination).toMatchObject({ limit: 5, offset: 5 });

    const ids = [...first.data, ...second.data].map((p) => p.id);
    expect(new Set(ids).size).toBe(10);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  test('accepts the maximum page size', { tag: '@regression' }, async ({ anonymous }) => {
    const body = (await (await anonymous.list({ limit: 100 })).json()) as ProductList;

    expect(body.pagination.limit).toBe(100);
  });

  test('offset past the end gives an empty page but keeps the total', { tag: '@regression' }, async ({ anonymous }) => {
    const body = (await (await anonymous.list({ offset: 1_000_000 })).json()) as ProductList;

    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBeGreaterThan(0);
  });

  test.describe('search', () => {
    const search = async (client: ProductsClient, term: string) =>
      (await (await client.list({ search: term })).json()) as ProductList;

    test('matches part of a name, ignoring case', { tag: '@regression' }, async ({ anonymous }) => {
      const body = await search(anonymous, 'KEYBOARD');

      expect(body.data.map((p) => p.name)).toContain('Seeded Mechanical Keyboard');
      expect(body.data.every((p) => p.name.toLowerCase().includes('keyboard'))).toBe(true);
    });

    test('returns an empty list when nothing matches', { tag: '@regression' }, async ({ anonymous }) => {
      const body = await search(anonymous, 'no-such-product-anywhere');

      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
    });

    test('treats % as a literal character', { tag: ['@regression', '@security'] }, async ({ anonymous }) => {
      const body = await search(anonymous, '%');

      expect(body.data.map((p) => p.name)).toEqual(['Seeded 100% Cotton Tee']);
    });

    test('treats _ as a literal character', { tag: ['@regression', '@security'] }, async ({ anonymous }) => {
      const body = await search(anonymous, '_');

      expect(body.data).toEqual([]);
    });

    test('SQL metacharacters are inert', { tag: '@security' }, async ({ anonymous }) => {
      for (const term of ["' OR '1'='1", "'; DROP TABLE products; --"]) {
        const body = await search(anonymous, term);
        expect(body.data).toEqual([]);
      }

      const after = (await (await anonymous.list({ limit: 1 })).json()) as ProductList;
      expect(after.pagination.total).toBeGreaterThan(0);
    });
  });

  const invalidQueries: Array<[string, Record<string, string | number>]> = [
    ['limit of 0', { limit: 0 }],
    ['limit above the maximum', { limit: 101 }],
    ['negative limit', { limit: -1 }],
    ['non-numeric limit', { limit: 'ten' }],
    ['fractional limit', { limit: '2.5' }],
    ['negative offset', { offset: -1 }],
    ['non-numeric offset', { offset: 'abc' }],
    ['search term over 100 characters', { search: 'x'.repeat(101) }],
  ];

  for (const [description, query] of invalidQueries) {
    test(`rejects ${description}`, { tag: '@negative' }, async ({ anonymous }) => {
      await expectError(await anonymous.list(query), 400, 'VALIDATION_ERROR');
    });
  }
});
