import { test as base, expect } from '@playwright/test';
import { Pool } from 'pg';
import { AuthClient } from '../clients/auth.client';
import { ProductsClient } from '../clients/products.client';
import { buildProduct } from '../data/product.data';
import { users } from '../data/users';
import { API_BASE_URL, API_TIMEOUT, DATABASE_URL } from '../support/env';
import type { Product, ProductInput } from '../types';

interface ProductFactory {
  /** Creates a product through the API as admin. It is deleted again after the test. */
  create(overrides?: Partial<ProductInput>): Promise<Product>;
  /** Registers a product the test created itself (for example while testing POST) for cleanup. */
  track(id: number): void;
}

type TestFixtures = {
  auth: AuthClient;
  anonymous: ProductsClient;
  asAdmin: ProductsClient;
  asCustomer: ProductsClient;
  productFactory: ProductFactory;
};

type WorkerFixtures = {
  tokens: { admin: string; customer: string };
  db: Pool;
};

async function loginAs(auth: AuthClient, credentials: { email: string; password: string }) {
  const response = await auth.login(credentials);
  expect(response.status(), `login as ${credentials.email}: ${await response.text()}`).toBe(200);
  return (await response.json()).accessToken as string;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // One login per worker instead of one per test.
  tokens: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({ baseURL: API_BASE_URL, timeout: API_TIMEOUT });
      try {
        const auth = new AuthClient(context);
        const [admin, customer] = await Promise.all([loginAs(auth, users.admin), loginAs(auth, users.customer)]);
        await use({ admin, customer });
      } finally {
        await context.dispose();
      }
    },
    { scope: 'worker' },
  ],

  db: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured first argument
    async ({}, use) => {
      const pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
      await use(pool);
      await pool.end();
    },
    { scope: 'worker' },
  ],

  auth: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  anonymous: async ({ request }, use) => {
    await use(new ProductsClient(request));
  },

  asAdmin: async ({ request, tokens }, use) => {
    await use(new ProductsClient(request, tokens.admin));
  },

  asCustomer: async ({ request, tokens }, use) => {
    await use(new ProductsClient(request, tokens.customer));
  },

  productFactory: async ({ asAdmin }, use) => {
    const createdIds: number[] = [];

    await use({
      async create(overrides = {}) {
        const response = await asAdmin.create(buildProduct(overrides));
        expect(response.status(), await response.text()).toBe(201);
        const { data } = (await response.json()) as { data: Product };
        createdIds.push(data.id);
        return data;
      },
      track(id) {
        createdIds.push(id);
      },
    });

    // A test may already have deleted its product, so a 404 here is fine.
    for (const id of createdIds.reverse()) {
      await asAdmin.remove(id);
    }
  },
});

export { expect };
