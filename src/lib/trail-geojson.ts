import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';

const TRAIL_NAMES = ['PCT', 'CDT', 'AT'] as const;

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
