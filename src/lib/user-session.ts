import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { isValidSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyUserSession } from '@/lib/password';
import { getUserById, toPublicUser, type PublicUser, type User } from '@/lib/users';
import { getSiteOwnerUser } from '@/lib/site-owner';

export const USER_SESSION_COOKIE = 'user_session';
export const USER_ID_COOKIE = 'user_id';

async function userFromSession(
  userId: string | undefined,
  token: string | undefined,
  adminCookie: string | undefined,
): Promise<User | null> {
  if (userId && verifyUserSession(userId, token)) {
    return getUserById(userId);
  }
  if (isValidSession(adminCookie)) {
    return getSiteOwnerUser();
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  return userFromSession(
    cookieStore.get(USER_ID_COOKIE)?.value,
    cookieStore.get(USER_SESSION_COOKIE)?.value,
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
}

export async function getCurrentPublicUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user ? toPublicUser(user) : null;
}

export function getUserFromRequest(request: NextRequest): Promise<User | null> {
  return userFromSession(
    request.cookies.get(USER_ID_COOKIE)?.value,
    request.cookies.get(USER_SESSION_COOKIE)?.value,
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
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
