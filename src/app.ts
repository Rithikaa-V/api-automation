import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './api/routes/auth';
import productRoutes from './api/routes/products';
import { errorHandler, notFoundHandler, sendError } from './api/errors';
import { asyncHandler } from './api/async-handler';
import { env } from './config/env';
import { pool } from './db/pool';

export interface AppOptions {
  /** Failed login attempts allowed per IP per minute. */
  authRateLimitMax?: number;
}

export function createApp({ authRateLimitMax = env.AUTH_RATE_LIMIT_MAX }: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: false }));
  app.use(express.json({ limit: '100kb' }));

  app.get(
    '/health',
    asyncHandler(async (_req, res) => {
      try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'ok' });
      } catch {
        res.status(503).json({ status: 'unavailable' });
      }
    }),
  );

  // Only failed attempts count, so a test run that logs in a lot does not lock itself out.
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (_req, res) => {
      sendError(res, 429, 'RATE_LIMITED', 'Too many failed login attempts, try again later');
    },
  });

  app.use('/api/v1/auth', loginLimiter, authRoutes);
  app.use('/api/v1/products', productRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
