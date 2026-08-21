import { Suspense } from 'react';
import { readConfig } from '@/lib/config';
import { getPublishedPostsForUser } from '@/lib/posts';
import { getDefaultJournalPosts } from '@/lib/default-journal';
import { loadTrailGeoJsonsForUser } from '@/lib/trail-geojson';
import { getCurrentUser } from '@/lib/user-session';
import { getSiteOwner, getSiteOwnerTrailIds, getSiteOwnerUserId } from '@/lib/site-owner';
import { getAllUsers } from '@/lib/users';
import { getFollowingIds } from '@/lib/follows';
import { getActiveRoutes } from '@/lib/active-routes';
import { completedTrailPathsFromRoutes } from '@/lib/completed-trails';
import MapPageTabs from '@/components/map/MapPageTabsLoader';
import type { TramilyHiker, TramilyMap } from '@/components/profile/TramilyHikerList';

export default async function MapPage() {
  const config = readConfig();
  const user = await getCurrentUser();
  const owner = getSiteOwner();

  const myPosts = user ? await getPublishedPostsForUser(user.id) : await getDefaultJournalPosts();
  const trailIds = user ? user.trailsCompleted : await getSiteOwnerTrailIds();
  const trailGeoJsons = loadTrailGeoJsonsForUser(trailIds);
  const routesUserId = user?.id ?? (await getSiteOwnerUserId());
  const completedRoutes = completedTrailPathsFromRoutes(await getActiveRoutes(routesUserId));
  const tramilyIds = user ? new Set(await getFollowingIds(user.id)) : new Set<string>();
  const otherHikers = user
    ? (await getAllUsers()).filter((hiker) => hiker.id !== user.id)
    : [];
  const hikers: TramilyHiker[] = otherHikers
    .map((hiker) => ({
      username: hiker.username,
      displayName: hiker.displayName,
      inTramily: tramilyIds.has(hiker.id),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const tramilyMaps: TramilyMap[] = user
    ? await Promise.all(
        otherHikers
          .filter((hiker) => tramilyIds.has(hiker.id))
          .map(async (hiker) => ({
            username: hiker.username,
            displayName: hiker.displayName,
            posts: await getPublishedPostsForUser(hiker.id),
            trailGeoJsons: loadTrailGeoJsonsForUser(hiker.trailsCompleted),
            completedRoutes: completedTrailPathsFromRoutes(await getActiveRoutes(hiker.id)),
          })),
      )
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
          friendsPosts={[]}
          trailGeoJsons={trailGeoJsons}
          completedRoutes={completedRoutes}
          defaultCenter={config.map.defaultCenter}
          defaultZoom={config.map.defaultZoom}
          isLoggedIn={!!user}
          ownerDisplayName={owner.displayName}
          hikers={hikers}
          tramilyMaps={tramilyMaps}
          completedTrailIds={user?.trailsCompleted ?? []}
        />
      </Suspense>
    </main>
  );
}
