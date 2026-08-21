import { haversineMiles, uid, type Waypoint } from '@/lib/routes';
import type { LatLng } from '@/lib/long-trails';

export const MIN_WALK_MILES = 0.08;
export const MAX_WALK_MILES = 35;

const USER_AGENT = 'TrailJournal/1.0 (https://trail-journal-inky.vercel.app)';
const OSRM_FOOT =
  'https://routing.openstreetmap.de/routed-foot/route/v1/driving';

export function shouldTryWalkPath(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): boolean {
  const d = haversineMiles(from, to);
  return d >= MIN_WALK_MILES && d <= MAX_WALK_MILES;
}

export function isReasonableWalk(straightMiles: number, routeMeters: number): boolean {
  const routeMiles = routeMeters / 1609.34;
  if (routeMiles < MIN_WALK_MILES) return false;
  return routeMiles <= Math.max(straightMiles * 4, straightMiles + 8);
}

export function simplifyPath(
  points: LatLng[],
  minMiles = 0.12,
  maxPoints = 40,
): LatLng[] {
  if (points.length <= 2) return points;
  const first = points[0];
  const lastPoint = points[points.length - 1];
  if (!first || !lastPoint) return points;

  const kept: LatLng[] = [first];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const prev = kept[kept.length - 1];
    if (!p || !prev) continue;
    if (haversineMiles(prev, p) >= minMiles) kept.push(p);
    if (kept.length >= maxPoints - 1) break;
  }
  const prev = kept[kept.length - 1];
  if (prev && haversineMiles(prev, lastPoint) > 0.02) kept.push(lastPoint);
  else if (prev) kept[kept.length - 1] = lastPoint;
  return kept;
}

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance: number;
    geometry?: { type: string; coordinates?: [number, number][] };
  }>;
};

export async function fetchWalkPath(
  from: LatLng,
  to: LatLng,
): Promise<LatLng[]> {
  if (!shouldTryWalkPath(from, to)) return [];

  const url =
    `${OSRM_FOOT}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    '?overview=full&geometries=geojson&alternatives=false';

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = (await res.json()) as OsrmResponse;
  const route = data.routes?.[0];
  const coords = route?.geometry?.coordinates;
  if (!route || !coords || coords.length < 2) return [];

  const straight = haversineMiles(from, to);
  if (!isReasonableWalk(straight, route.distance)) return [];

  return simplifyPath(
    coords.map(([lng, lat]) => ({ lat, lng })),
  );
}

export function requestWalkPath(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<{ lat: number; lng: number }[]> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
  });
  return fetch(`/api/walk-path?${params}`)
    .then(async (res) => {
      if (!res.ok) return [];
      const data = (await res.json()) as { path?: { lat: number; lng: number }[] };
      return data.path ?? [];
    })
    .catch(() => []);
}

export function appendRoutedPin(
  waypoints: Waypoint[],
  dest: Waypoint,
  path: LatLng[],
): { waypoints: Waypoint[]; added: number; usedPath: boolean } {
  const last = waypoints[waypoints.length - 1];
  const shape: Waypoint[] = [];
  for (const p of simplifyPath(path)) {
    if (last && haversineMiles(last, p) < 0.04) continue;
    if (haversineMiles(dest, p) < 0.04) continue;
    shape.push({
      id: uid('path'),
      name: 'Path',
      lat: p.lat,
      lng: p.lng,
      note: 'Walkable path',
      kind: 'shape',
    });
  }
  return {
    waypoints: [...waypoints, ...shape, dest],
    added: shape.length + 1,
    usedPath: shape.length > 0,
  };
}
