import dynamic from 'next/dynamic';
import Link from 'next/link';
import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import { getPublishedPosts } from '@/lib/posts';
import { readConfig } from '@/lib/config';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

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

export default function MapPage() {
  const config = readConfig();
  const posts = getPublishedPosts();
  const trailGeoJsons = loadTrailGeoJsons();

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-stone-200 bg-white shrink-0">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-sm text-emerald-700 hover:underline">
            ← Trail Journal
          </Link>
          <span className="text-stone-300">|</span>
          <span className="text-sm font-medium text-stone-700">Map</span>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapView
          posts={posts}
          trailGeoJsons={trailGeoJsons}
          defaultCenter={config.map.defaultCenter}
          defaultZoom={config.map.defaultZoom}
        />
      </div>
    </div>
  );
}
