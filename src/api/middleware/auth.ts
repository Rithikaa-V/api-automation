import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { sendError } from '../errors';

export type Role = 'admin' | 'customer';
export type AuthUser = { sub: string; role: Role; email: string };

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

const BEARER = /^Bearer\s+(\S+)$/i;
const ROLES: readonly string[] = ['admin', 'customer'];

function toAuthUser(payload: string | jwt.JwtPayload): AuthUser | null {
  if (typeof payload === 'string') return null;
  const { sub, email, role } = payload;
  if (typeof sub !== 'string' || typeof email !== 'string' || typeof role !== 'string') return null;
  if (!ROLES.includes(role)) return null;
  return { sub, email, role: role as Role };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const match = BEARER.exec(req.header('authorization') ?? '');
  if (!match) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Bearer token required');
  }

  try {
    const payload = jwt.verify(match[1], env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = toAuthUser(payload);
    if (!user) throw new Error('unexpected token payload');
    req.authUser = user;
    next();
  } catch {
    return sendError(res, 401, 'INVALID_TOKEN', 'Token is invalid or expired');
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return sendError(res, 403, 'FORBIDDEN', 'Insufficient permissions');
    }
    next();
  };
}
