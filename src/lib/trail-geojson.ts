import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';

const TRAIL_NAMES = ['PCT', 'CDT', 'AT'] as const;

const LONG_TRAIL_ID_TO_GEOJSON: Record<string, (typeof TRAIL_NAMES)[number]> = {
  at: 'AT',
  pct: 'PCT',
  cdt: 'CDT',
};

export function loadTrailGeoJsonsForUser(trailIds: string[]): Record<string, FeatureCollection> {
  const all = loadTrailGeoJsons();
  const result: Record<string, FeatureCollection> = {};
  for (const id of trailIds) {
    const key = LONG_TRAIL_ID_TO_GEOJSON[id];
    if (key && all[key]) result[key] = all[key];
  }
  return result;
}

export function loadTrailGeoJsons(): Record<string, FeatureCollection> {
  const result: Record<string, FeatureCollection> = {};
  for (const trail of TRAIL_NAMES) {
    const filePath = path.join(
      process.cwd(),
      'public',
      'trails',
      `${trail.toLowerCase()}.geojson`,
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
