import { readConfig } from '@/lib/config';
import { getUserByUsername } from '@/lib/users';

export function getSiteOwner() {
  const config = readConfig();
  return config.siteOwner;
}

export function getSiteOwnerUsername(): string {
  return getSiteOwner().username;
}

export async function getSiteOwnerUserId(): Promise<string> {
  const user = await getUserByUsername(getSiteOwnerUsername());
  return user?.id ?? 'user-lynley';
}
