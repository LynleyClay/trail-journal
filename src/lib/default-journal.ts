import { getPublishedPostsForUser } from '@/lib/posts';
import { getSiteOwnerUserId } from '@/lib/site-owner';

/** Posts shown on home and My Trails when no user account session is active. */
export async function getDefaultJournalPosts() {
  const ownerId = await getSiteOwnerUserId();
  return getPublishedPostsForUser(ownerId);
}
