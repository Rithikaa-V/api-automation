import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { pool } from './pool';
import { seedProducts, seedUsers } from './seed-data';

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo accounts when NODE_ENV=production');
  }

  try {
    for (const user of seedUsers) {
      const hash = await bcrypt.hash(user.password, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
        [user.email, hash, user.role],
      );
    }

    for (const product of seedProducts) {
      const existing = await pool.query('SELECT 1 FROM products WHERE name = $1', [product.name]);
      if (existing.rowCount === 0) {
        await pool.query('INSERT INTO products (name, description, price, stock) VALUES ($1, $2, $3, $4)', [
          product.name,
          product.description,
          product.price,
          product.stock,
        ]);
      }
    }

    console.log('Seed data ensured');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
