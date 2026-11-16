import { Pool, types } from 'pg';
import { env } from '../config/env';

// node-postgres returns BIGINT as a string, which would leak into responses as "id": "12".
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10_000,
});
