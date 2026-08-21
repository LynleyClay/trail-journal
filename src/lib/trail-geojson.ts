import * as fs from 'fs';
import * as path from 'path';
import type { FeatureCollection } from 'geojson';
import { LONG_TRAILS, type LongTrail } from '@/lib/long-trails';

const DETAILED_TRAIL_FILES = ['PCT', 'CDT', 'AT'] as const;

const LONG_TRAIL_ID_TO_GEOJSON: Record<string, (typeof DETAILED_TRAIL_FILES)[number]> = {
  at: 'AT',
  pct: 'PCT',
  cdt: 'CDT',
};

export function loadTrailGeoJsonsForUser(trailIds: string[]): Record<string, FeatureCollection> {
  const result: Record<string, FeatureCollection> = {};
  for (const id of trailIds) {
    const trail = LONG_TRAILS.find((item) => item.id === id);
    if (!trail) continue;
    const fileAbbrev = LONG_TRAIL_ID_TO_GEOJSON[id];
    const fromFile = fileAbbrev ? readTrailFile(fileAbbrev) : null;
    result[trail.abbrev] = fromFile ?? corridorFromTrail(trail);
  }
  return result;
}

export function loadTrailGeoJsons(): Record<string, FeatureCollection> {
  const result: Record<string, FeatureCollection> = {};
  for (const trail of DETAILED_TRAIL_FILES) {
    const fromFile = readTrailFile(trail);
    result[trail] = fromFile ?? corridorFeatureCollection(trail);
  }
  return result;
}

function readTrailFile(trail: (typeof DETAILED_TRAIL_FILES)[number]): FeatureCollection | null {
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

function corridorFromTrail(trail: LongTrail): FeatureCollection {
  const coordinates = trail.path.map((point) => [point.lng, point.lat]);
  return {
    type: 'FeatureCollection',
    features:
      coordinates.length >= 2
        ? [
            {
              type: 'Feature',
              properties: { name: trail.name, id: trail.id, color: trail.color },
              geometry: { type: 'LineString', coordinates },
            },
          ]
        : [],
  };
}

function corridorFeatureCollection(abbrev: (typeof DETAILED_TRAIL_FILES)[number]): FeatureCollection {
  const trail = LONG_TRAILS.find((item) => item.abbrev === abbrev);
  return trail ? corridorFromTrail(trail) : { type: 'FeatureCollection', features: [] };
}
