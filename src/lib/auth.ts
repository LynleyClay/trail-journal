import { createHash, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE_NAME = 'admin_session';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPass);
}

// Derived from the configured credentials rather than a separate secret —
// rotating ADMIN_PASSWORD automatically invalidates any existing sessions.
export function sessionToken(): string | null {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) return null;
  return createHash('sha256').update(`${user}:${pass}`).digest('hex');
}

export function isValidSession(cookieValue: string | undefined): boolean {
  const expected = sessionToken();
  if (!expected || !cookieValue) return false;
  return safeEqual(cookieValue, expected);
}
