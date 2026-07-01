import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import { getPublishedPosts } from '@/lib/posts';
import { readConfig } from '@/lib/config';
import MapView from '@/components/MapViewLoader';

const TRAIL_NAMES = ['PCT', 'CDT', 'AT'] as const;

function loadTrailGeoJsons(): Record<string, FeatureCollection> {
  const result: Record<string, FeatureCollection> = {};
  for (const trail of TRAIL_NAMES) {
    const filePath = path.join(
      process.cwd(),
      'public',
      'trails',
      `${trail.toLowerCase()}.geojson`
    );
    if (fs.existsSync(filePath)) {
      try {
        result[trail] = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as FeatureCollection;
      } catch {
        // Skip malformed GeoJSON files
      }
    }
  }
  return result;
}

export default async function MapPage() {
  const config = readConfig();
  const posts = await getPublishedPosts();
  const trailGeoJsons = loadTrailGeoJsons();

  return (
    <div className="flex-1 relative">
      <MapView
        posts={posts}
        trailGeoJsons={trailGeoJsons}
        defaultCenter={config.map.defaultCenter}
        defaultZoom={config.map.defaultZoom}
      />
    </div>
  );
}
