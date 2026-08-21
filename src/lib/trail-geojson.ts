import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import { LONG_TRAILS } from '@/lib/long-trails';

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
    const fromFile = readTrailFile(trail);
    result[trail] = fromFile ?? corridorFeatureCollection(trail);
  }
  return result;
}

function readTrailFile(trail: (typeof TRAIL_NAMES)[number]): FeatureCollection | null {
  const filePath = path.join(
    process.cwd(),
    'public',
    'trails',
    `${trail.toLowerCase()}.geojson`,
  );
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as FeatureCollection;
  } catch {
    return null;
  }
}

function corridorFeatureCollection(abbrev: (typeof TRAIL_NAMES)[number]): FeatureCollection {
  const trail = LONG_TRAILS.find((item) => item.abbrev === abbrev);
  const coordinates = (trail?.path ?? []).map((point) => [point.lng, point.lat]);
  return {
    type: 'FeatureCollection',
    features:
      coordinates.length >= 2
        ? [
            {
              type: 'Feature',
              properties: { name: trail?.name ?? abbrev, id: trail?.id ?? abbrev.toLowerCase() },
              geometry: { type: 'LineString', coordinates },
            },
          ]
        : [],
  };
}
