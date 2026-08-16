import { Suspense } from 'react';
import { getPublishedPosts } from '@/lib/posts';
import { readConfig } from '@/lib/config';
import { loadTrailGeoJsons } from '@/lib/trail-geojson';
import MapPageTabs from '@/components/map/MapPageTabsLoader';

export default async function MapPage() {
  const config = readConfig();
  const posts = await getPublishedPosts();
  const trailGeoJsons = loadTrailGeoJsons();

  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center text-stone-500 text-sm">
          Loading map…
        </div>
      }
    >
      <MapPageTabs
        posts={posts}
        trailGeoJsons={trailGeoJsons}
        defaultCenter={config.map.defaultCenter}
        defaultZoom={config.map.defaultZoom}
      />
    </Suspense>
  );
}
