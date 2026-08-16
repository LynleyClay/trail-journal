import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  const parts = stored.split(':');
  const salt = parts[0];
  const hash = parts[1];
  if (!salt || !hash) return false;
  const hashBuf = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (hashBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(hashBuf, storedBuf);
}

export function sessionSecret(): string {
  return (
    process.env.USER_SESSION_SECRET ??
    process.env.ADMIN_PASSWORD ??
    'trail-journal-dev-secret'
  );
}

export function signUserSession(userId: string): string {
  return createHmac('sha256', sessionSecret()).update(userId).digest('hex');
}

export function verifyUserSession(userId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signUserSession(userId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
