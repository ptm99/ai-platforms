import jwt, { SignOptions } from 'jsonwebtoken';

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email?: string;
}

/**
 * jsonwebtoken typings differ by version.
 * Some versions use a template-literal StringValue type internally but do not export it.
 * The most stable approach is to type expiresIn via SignOptions['expiresIn'].
 */
type ExpiresIn = NonNullable<SignOptions['expiresIn']>;

function getExpiresIn(value: string | undefined, fallback: ExpiresIn): ExpiresIn {
  // Runtime accepts string formats like "15m", "30d".
  // We trust config; optionally validate at startup if needed.
  return (value ? (value as ExpiresIn) : fallback);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET not set');

  const options: SignOptions = {
    expiresIn: getExpiresIn(process.env.JWT_ACCESS_EXPIRES_IN, '15m' as ExpiresIn)
  };

  return jwt.sign(payload, secret, options);
}

export function signRefreshToken(payload: { sub: string }): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not set');

  const options: SignOptions = {
    expiresIn: getExpiresIn(process.env.JWT_REFRESH_EXPIRES_IN, '30d' as ExpiresIn)
  };

  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET not set');

  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not set');

  return jwt.verify(token, secret) as { sub: string };
}
