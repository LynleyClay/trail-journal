import { haversineMiles, type Waypoint } from '@/lib/routes';

function pointToSegmentDistanceMiles(
  p: { lat: number; lng: number },
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const d0 = haversineMiles(p, a);
  const d1 = haversineMiles(p, b);
  const segLen = haversineMiles(a, b);
  if (segLen < 0.001) return d0;

  const steps = Math.max(2, Math.ceil(segLen / 0.5));
  let min = Math.min(d0, d1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    min = Math.min(
      min,
      haversineMiles(p, {
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng),
      }),
    );
  }
  return min;
}

export function distanceToRouteMiles(
  poi: { lat: number; lng: number },
  waypoints: Waypoint[],
): number {
  let min = Infinity;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    if (a && b) min = Math.min(min, pointToSegmentDistanceMiles(poi, a, b));
  }
  return min;
}

export function filterPoisNearRoute<T extends { lat: number; lng: number }>(
  pois: T[],
  waypoints: Waypoint[],
  maxMiles: number,
): T[] {
  return pois
    .map((poi) => ({ poi, dist: distanceToRouteMiles(poi, waypoints) }))
    .filter(({ dist }) => dist <= maxMiles)
    .sort((a, b) => a.dist - b.dist)
    .map(({ poi }) => poi);
}

export function formatTownType(detail?: string): string {
  if (!detail) return 'Town';
  const map: Record<string, string> = {
    city: 'City',
    town: 'Town',
    village: 'Village',
    hamlet: 'Hamlet',
    settlement: 'Settlement',
  };
  return map[detail.toLowerCase()] ?? detail.replace(/_/g, ' ');
}

export function formatWaterType(detail?: string): string {
  if (!detail) return 'Water source';
  const map: Record<string, string> = {
    spring: 'Natural spring',
    drinking_water: 'Drinking water',
    water_point: 'Water point',
    water: 'Water source',
  };
  return map[detail.toLowerCase()] ?? detail.replace(/_/g, ' ');
}
