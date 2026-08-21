import { Suspense } from 'react';
import { readConfig } from '@/lib/config';
import { getPublishedPostsForFollowing, getPublishedPostsForUser } from '@/lib/posts';
import { getDefaultJournalPosts } from '@/lib/default-journal';
import { loadTrailGeoJsonsForUser } from '@/lib/trail-geojson';
import { getCurrentUser } from '@/lib/user-session';
import { getSiteOwner, getSiteOwnerTrailIds } from '@/lib/site-owner';
import { getAllUsers } from '@/lib/users';
import { getFollowingIds } from '@/lib/follows';
import MapPageTabs from '@/components/map/MapPageTabsLoader';
import type { TramilyHiker } from '@/components/profile/TramilyHikerList';

export default async function MapPage() {
  const config = readConfig();
  const user = await getCurrentUser();
  const owner = getSiteOwner();

  const myPosts = user ? await getPublishedPostsForUser(user.id) : await getDefaultJournalPosts();
  const friendsPosts = user ? await getPublishedPostsForFollowing(user.id) : [];
  const trailIds = user ? user.trailsCompleted : await getSiteOwnerTrailIds();
  const trailGeoJsons = loadTrailGeoJsonsForUser(trailIds);
  const tramilyIds = user ? new Set(await getFollowingIds(user.id)) : new Set<string>();
  const hikers: TramilyHiker[] = user
    ? (await getAllUsers())
        .filter((hiker) => hiker.id !== user.id)
        .map((hiker) => ({
          username: hiker.username,
          displayName: hiker.displayName,
          inTramily: tramilyIds.has(hiker.id),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
    : [];

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-stone-500 text-sm">
            Loading map…
          </div>
        }
      >
        <MapPageTabs
          myPosts={myPosts}
          friendsPosts={friendsPosts}
          trailGeoJsons={trailGeoJsons}
          defaultCenter={config.map.defaultCenter}
          defaultZoom={config.map.defaultZoom}
          isLoggedIn={!!user}
          ownerDisplayName={owner.displayName}
          hikers={hikers}
        />
      </Suspense>
    </main>
  );
}
