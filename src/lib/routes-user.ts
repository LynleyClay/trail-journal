import type { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-session';
import { getSiteOwnerUserId } from '@/lib/site-owner';

/** Routes belong to the signed-in user, or the site owner when browsing without an account. */
export async function getRoutesUserId(request: NextRequest): Promise<string> {
  const user = await getUserFromRequest(request);
  return user?.id ?? (await getSiteOwnerUserId());
}
