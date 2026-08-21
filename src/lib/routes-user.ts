import type { NextRequest } from 'next/server';
import { getAdminSession, getUserFromRequest } from '@/lib/auth-session';
import { getSiteOwnerUserId } from '@/lib/site-owner';

async function authenticatedRoutesUserId(request: NextRequest): Promise<string | null> {
  const user = await getUserFromRequest(request);
  if (user) return user.id;
  if (getAdminSession(request)) return getSiteOwnerUserId();
  return null;
}

/** Public map: signed-in user's routes, or the site owner's trails for guests. */
export async function getRoutesUserId(request: NextRequest): Promise<string> {
  return (await authenticatedRoutesUserId(request)) ?? getSiteOwnerUserId();
}

/** Creating or changing routes requires an account (or the site admin session). */
export async function getRoutesAuthorId(request: NextRequest): Promise<string | null> {
  return authenticatedRoutesUserId(request);
}
