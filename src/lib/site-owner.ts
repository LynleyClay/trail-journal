import { readConfig } from '@/lib/config';
import { getUserById, getUserByUsername } from '@/lib/users';

export function getSiteOwner() {
  const config = readConfig();
  return config.siteOwner;
}

export function getSiteOwnerUsername(): string {
  return getSiteOwner().username;
}

export async function getSiteOwnerUser() {
  const byName = await getUserByUsername(getSiteOwnerUsername());
  if (byName) return byName;
  return getUserById('user-lynley');
}

export async function getSiteOwnerUserId(): Promise<string> {
  const user = await getSiteOwnerUser();
  return user?.id ?? 'user-lynley';
}

const FALLBACK_OWNER_TRAIL_IDS = ['at', 'pct', 'cdt'];

/** Long trails shown on the public (guest) map when nobody is signed in. */
export async function getSiteOwnerTrailIds(): Promise<string[]> {
  const user = await getSiteOwnerUser();
  if (user?.trailsCompleted.length) return user.trailsCompleted;
  return FALLBACK_OWNER_TRAIL_IDS;
}
