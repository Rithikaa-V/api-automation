import jwt from 'jsonwebtoken';

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Takes a real token and rewrites its payload without re-signing it. */
export function withTamperedPayload(token: string, changes: Record<string, unknown>): string {
  const [header, payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return [header, encode({ ...claims, ...changes }), signature].join('.');
}

/** Valid-looking token with `alg: none` and no signature. */
export function unsignedToken(claims: Record<string, unknown>): string {
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;
}

export function signToken(claims: Record<string, unknown>, secret: string): string {
  return jwt.sign(claims, secret, { algorithm: 'HS256' });
}
