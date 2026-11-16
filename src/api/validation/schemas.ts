import { z } from 'zod';

// Limits that mirror the column types in src/db/migrate.ts, so bad input gets a 400 instead of a DB error.
const MAX_PRICE = 99_999_999.99; // NUMERIC(10,2)
const MAX_STOCK = 2_147_483_647; // INTEGER

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  // bcrypt only looks at the first 72 bytes; the cap also keeps hashing cost bounded.
  password: z.string().min(1).max(128),
});

const price = z
  .number()
  .finite()
  .nonnegative()
  .max(MAX_PRICE)
  .refine((value) => Math.round(value * 100) / 100 === value, 'must have at most 2 decimal places');

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000).default(''),
  price,
  stock: z.number().int().nonnegative().max(MAX_STOCK).default(0),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

// 15 digits keeps the value inside Number.MAX_SAFE_INTEGER and inside BIGINT.
export const productIdSchema = z
  .string()
  .regex(/^[1-9]\d{0,14}$/, 'must be a positive integer')
  .transform(Number);

const queryInt = (min: number, max: number, fallback: number) =>
  z
    .string()
    .regex(/^\d+$/, 'must be a non-negative integer')
    .transform(Number)
    .pipe(z.number().min(min).max(max))
    .optional()
    .transform((value) => value ?? fallback);

export const listQuerySchema = z.object({
  limit: queryInt(1, 100, 20),
  offset: queryInt(0, Number.MAX_SAFE_INTEGER, 0),
  search: z.string().trim().max(100).optional(),
});
