import dotenv from 'dotenv';

dotenv.config();

export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
export const API_TIMEOUT = Number(process.env.API_TIMEOUT ?? 15_000);
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sdet:sdet_password@localhost:5432/sdet_store';

// Only needed by the tests that mint their own tokens (expired token case).
export const JWT_SECRET = process.env.JWT_SECRET;
