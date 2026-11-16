import type { Pool } from 'pg';

export interface ProductRow {
  name: string;
  description: string;
  price: number;
  stock: number;
}

export async function findProductRow(db: Pool, id: number): Promise<ProductRow | undefined> {
  const result = await db.query<ProductRow>(
    'SELECT name, description, price::float AS price, stock FROM products WHERE id = $1',
    [id],
  );
  return result.rows[0];
}

export async function countProductsNamed(db: Pool, name: string): Promise<number> {
  const result = await db.query('SELECT COUNT(*)::int AS total FROM products WHERE name = $1', [name]);
  return result.rows[0].total;
}
