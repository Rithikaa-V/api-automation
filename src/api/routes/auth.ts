import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { pool } from '../../db/pool';
import { asyncHandler } from '../async-handler';
import { sendError } from '../errors';
import { loginSchema } from '../validation/schemas';

const router = Router();

// Compared against when the email is unknown, so "no such user" and "wrong password"
// take about the same time and cannot be told apart by response timing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', parsed.error.flatten());
    }

    const { email, password } = parsed.data;
    const result = await pool.query('SELECT id, email, password_hash, role FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !passwordMatches) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    const accessToken = jwt.sign({ sub: String(user.id), role: user.role, email: user.email }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return res.status(200).json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.JWT_EXPIRES_IN,
      user: { id: user.id, email: user.email, role: user.role },
    });
  }),
);

export default router;
