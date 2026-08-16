import { getTrailById } from '@/lib/long-trails';
import guidesData from '../../content/data/trail-guides.json';

export type TrailStopKind = 'highlight' | 'resupply' | 'water';

export type TrailStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: TrailStopKind;
  note: string;
  mile?: number;
};

export type TrailGuide = {
  trailId: string;
  synopsis: string;
  bestSeason?: string;
  typicalDuration?: string;
  stops: TrailStop[];
};

const TRAIL_GUIDES: TrailGuide[] = guidesData as TrailGuide[];

export function getAllTrailGuides(): TrailGuide[] {
  return TRAIL_GUIDES;
}

export function getTrailGuide(trailId: string): TrailGuide | null {
  return TRAIL_GUIDES.find((g) => g.trailId === trailId) ?? null;
}

export function hasTrailGuide(trailId: string): boolean {
  return TRAIL_GUIDES.some((g) => g.trailId === trailId);
}

function stopKey(stop: TrailStop): string {
  return `${stop.kind}-${stop.name}-${stop.lat.toFixed(3)}-${stop.lng.toFixed(3)}`;
}

function dedupeStops(stops: TrailStop[], minMiles = 2): TrailStop[] {
  const kept: TrailStop[] = [];
  for (const stop of stops) {
    const tooClose = kept.some((k) => {
      const dLat = k.lat - stop.lat;
      const dLng = k.lng - stop.lng;
      return Math.sqrt(dLat * dLat + dLng * dLng) * 69 < minMiles;
    });
    if (!tooClose) kept.push(stop);
  }
  return kept;
}

export function getGuideStopsForTrails(trailIds: string[]): TrailStop[] {
  const stops: TrailStop[] = [];
  const seen = new Set<string>();
  for (const trailId of trailIds) {
    const guide = getTrailGuide(trailId);
    if (!guide) continue;
    for (const stop of guide.stops) {
      const key = stopKey(stop);
      if (seen.has(key)) continue;
      seen.add(key);
      stops.push({ ...stop, id: `${trailId}-${stop.id}` });
    }
  }
  return dedupeStops(stops);
}

export function getGuideStopCounts(trailIds: string[]): {
  highlights: number;
  resupply: number;
  water: number;
} {
  const stops = getGuideStopsForTrails(trailIds);
  return {
    highlights: stops.filter((s) => s.kind === 'highlight').length,
    resupply: stops.filter((s) => s.kind === 'resupply').length,
    water: stops.filter((s) => s.kind === 'water').length,
  };
}

export function getTrailDisplayMeta(trailId: string) {
  const trail = getTrailById(trailId);
  if (!trail) return null;
  return {
    trail,
    guide: getTrailGuide(trailId),
  };
}

export function stopsByKind(stops: TrailStop[], kind: TrailStopKind): TrailStop[] {
  return stops.filter((s) => s.kind === kind);
}
