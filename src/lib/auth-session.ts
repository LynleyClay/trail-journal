import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isValidSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/user-session';

export { getUserFromRequest };

export function getAdminSession(request: NextRequest): boolean {
  return isValidSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
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
