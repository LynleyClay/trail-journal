import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { verifyUserSession } from '@/lib/password';
import { getUserById, toPublicUser, type PublicUser, type User } from '@/lib/users';

export const USER_SESSION_COOKIE = 'user_session';
export const USER_ID_COOKIE = 'user_id';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_ID_COOKIE)?.value;
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  if (!userId || !verifyUserSession(userId, token)) return null;
  return getUserById(userId);
}

export async function getCurrentPublicUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user ? toPublicUser(user) : null;
}

export function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const userId = request.cookies.get(USER_ID_COOKIE)?.value;
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (!userId || !verifyUserSession(userId, token)) return Promise.resolve(null);
  return getUserById(userId);
}

export function setUserSessionCookies(
  response: { cookies: { set: (name: string, value: string, options?: object) => void } },
  userId: string,
  token: string,
): void {
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
  response.cookies.set(USER_ID_COOKIE, userId, opts);
  response.cookies.set(USER_SESSION_COOKIE, token, opts);
}

export function clearUserSessionCookies(response: {
  cookies: { set: (name: string, value: string, options?: object) => void };
}): void {
  const opts = { path: '/', maxAge: 0 };
  response.cookies.set(USER_ID_COOKIE, '', opts);
  response.cookies.set(USER_SESSION_COOKIE, '', opts);
}
