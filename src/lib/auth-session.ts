import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { verifyUserSession } from '@/lib/password';
import { getUserById, type User } from '@/lib/users';
import { USER_ID_COOKIE, USER_SESSION_COOKIE } from '@/lib/user-session';

export function getAdminSession(request: NextRequest): boolean {
  return isValidSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const userId = request.cookies.get(USER_ID_COOKIE)?.value;
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (!userId || !verifyUserSession(userId, token)) return null;
  return getUserById(userId);
}

export async function getAuthorUserId(request: NextRequest): Promise<string | null> {
  const user = await getUserFromRequest(request);
  if (user) return user.id;
  if (getAdminSession(request)) {
    const { getSiteOwnerUserId } = await import('@/lib/site-owner');
    return getSiteOwnerUserId();
  }
  return null;
}
