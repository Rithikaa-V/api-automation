import { randomUUID } from 'node:crypto';
import type { ProductInput } from '../types';

// Test records are always named with this prefix so global teardown can find leftovers.
export const TEST_PRODUCT_PREFIX = 'QA-AUTO';

export function buildProduct(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: `${TEST_PRODUCT_PREFIX}-${randomUUID().slice(0, 8)}`,
    description: 'Created by the API test suite',
    price: 29.95,
    stock: 7,
    ...overrides,
  };
}
