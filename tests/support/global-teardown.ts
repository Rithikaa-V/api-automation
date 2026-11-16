import { Pool } from 'pg';
import { DATABASE_URL } from './env';
import { TEST_PRODUCT_PREFIX } from '../data/product.data';

// Tests clean up after themselves. This only catches leftovers from runs that were killed half way.
export default async function globalTeardown() {
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const result = await pool.query('DELETE FROM products WHERE name LIKE $1', [`${TEST_PRODUCT_PREFIX}-%`]);
    if (result.rowCount) {
      console.warn(`Removed ${result.rowCount} leftover test product(s)`);
    }
  } catch (error) {
    console.warn('Skipped leftover cleanup:', error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}
