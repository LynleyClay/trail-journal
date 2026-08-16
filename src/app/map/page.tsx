import { Suspense } from 'react';
import { readConfig } from '@/lib/config';
import { getPublishedPostsForFollowing, getPublishedPostsForUser } from '@/lib/posts';
import { getDefaultJournalPosts } from '@/lib/default-journal';
import { loadTrailGeoJsons, loadTrailGeoJsonsForUser } from '@/lib/trail-geojson';
import { getCurrentUser } from '@/lib/user-session';
import MapPageTabs from '@/components/map/MapPageTabsLoader';

export default async function MapPage() {
  const config = readConfig();
  const user = await getCurrentUser();

  const myPosts = user ? await getPublishedPostsForUser(user.id) : await getDefaultJournalPosts();
  const friendsPosts = user ? await getPublishedPostsForFollowing(user.id) : [];
  const trailGeoJsons = user
    ? loadTrailGeoJsonsForUser(user.trailsCompleted)
    : loadTrailGeoJsons();

  return (
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
      />
    </Suspense>
  );
}
