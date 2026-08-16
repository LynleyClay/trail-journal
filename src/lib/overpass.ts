import type { Waypoint } from '@/lib/routes';
import type { RoutePoi } from '@/lib/active-routes';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Pick evenly spaced waypoints along the route (always on the trail line). */
function sampleWaypointsEvenly(waypoints: Waypoint[], maxSamples = 14): Waypoint[] {
  if (waypoints.length <= maxSamples) return waypoints;
  const samples: Waypoint[] = [];
  for (let i = 0; i < maxSamples; i++) {
    const idx = Math.round((i * (waypoints.length - 1)) / (maxSamples - 1));
    samples.push(waypoints[idx]!);
  }
  return samples;
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') results.push(outcome.value);
    }
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return results;
}

function elementCoords(el: OverpassElement): { lat: number; lng: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

function elementName(el: OverpassElement, fallback: string): string {
  const tags = el.tags ?? {};
  return tags.name ?? tags['name:en'] ?? fallback;
}

function dedupePois(items: RoutePoi[], minMiles = 2): RoutePoi[] {
  const kept: RoutePoi[] = [];
  for (const item of items) {
    const tooClose = kept.some((k) => {
      const dLat = k.lat - item.lat;
      const dLng = k.lng - item.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 69;
      return dist < minMiles;
    });
    if (!tooClose) kept.push(item);
  }
  return kept;
}

async function runOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: Error | null = null;

  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'User-Agent': 'TrailJournal/1.0 (https://trail-journal-inky.vercel.app)',
        },
        body: `data=${encodeURIComponent(query.trim())}`,
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        lastError = new Error(`Overpass API error: ${res.status}`);
        continue;
      }
      const data = (await res.json()) as { elements?: OverpassElement[] };
      return data.elements ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Overpass API unavailable');
}

async function queryPoisNear(lat: number, lng: number, radiusM = 15000): Promise<{
  towns: OverpassElement[];
  water: OverpassElement[];
}> {
  const townQuery = `
[out:json][timeout:20];
(
  node["place"="city"](around:${radiusM},${lat},${lng});
  node["place"="town"](around:${radiusM},${lat},${lng});
  node["place"="village"](around:${radiusM},${lat},${lng});
  node["place"="hamlet"](around:${radiusM},${lat},${lng});
);
out body 25;
`;

  const waterQuery = `
[out:json][timeout:20];
(
  node["natural"="spring"](around:${radiusM},${lat},${lng});
  node["amenity"="drinking_water"](around:${radiusM},${lat},${lng});
  node["amenity"="water_point"](around:${radiusM},${lat},${lng});
);
out body 30;
`;

  let towns: OverpassElement[] = [];
  let waterEls: OverpassElement[] = [];
  const [townsResult, waterResult] = await Promise.allSettled([
    runOverpass(townQuery),
    runOverpass(waterQuery),
  ]);
  if (townsResult.status === 'fulfilled') towns = townsResult.value;
  if (waterResult.status === 'fulfilled') waterEls = waterResult.value;
  return { towns, water: waterEls };
}

async function fetchTownsNominatimAt(lat: number, lng: number): Promise<RoutePoi[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&featuretype=settlement` +
    `&limit=12&viewbox=${lng - 0.35},${lat + 0.35},${lng + 0.35},${lat - 0.35}&bounded=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'TrailJournal/1.0 (https://trail-journal-inky.vercel.app)' },
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const results = (await res.json()) as Array<{
    place_id: number;
    name: string;
    lat: string;
    lon: string;
    type?: string;
  }>;

  return results.map((r) => ({
    id: `nominatim-${r.place_id}`,
    name: r.name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    kind: 'town' as const,
    detail: r.type ?? 'settlement',
  }));
}

async function fetchTownsNominatim(waypoints: Waypoint[]): Promise<RoutePoi[]> {
  const samples = sampleWaypointsEvenly(waypoints, 4);
  const all: RoutePoi[] = [];
  for (const point of samples) {
    try {
      all.push(...(await fetchTownsNominatimAt(point.lat, point.lng)));
    } catch {
      // try next sample
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return all;
}

export async function fetchRoutePois(waypoints: Waypoint[]): Promise<{
  resupply: RoutePoi[];
  water: RoutePoi[];
}> {
  if (waypoints.length < 2) {
    return { resupply: [], water: [] };
  }

  const samples = sampleWaypointsEvenly(waypoints);
  const allTowns: OverpassElement[] = [];
  const allWater: OverpassElement[] = [];

  try {
    const batches = await mapInBatches(samples, 2, (point) =>
      queryPoisNear(point.lat, point.lng),
    );
    for (const { towns, water } of batches) {
      allTowns.push(...towns);
      allWater.push(...water);
    }
  } catch {
    // Overpass unavailable — fall back below for towns
  }

  let resupplyFromOverpass: RoutePoi[] = [];
  for (const el of allTowns) {
    const coords = elementCoords(el);
    if (!coords) continue;
    const place = el.tags?.place ?? 'town';
    resupplyFromOverpass.push({
      id: `town-${el.type}-${el.id}`,
      name: elementName(el, place),
      lat: coords.lat,
      lng: coords.lng,
      kind: 'town',
      detail: place,
    });
  }

  const water: RoutePoi[] = [];
  for (const el of allWater) {
    const coords = elementCoords(el);
    if (!coords) continue;
    const tags = el.tags ?? {};
    const kind = tags.natural === 'spring' ? 'spring' : tags.amenity ?? 'water';
    water.push({
      id: `water-${el.type}-${el.id}`,
      name: elementName(el, kind.replace(/_/g, ' ')),
      lat: coords.lat,
      lng: coords.lng,
      kind: 'water',
      detail: kind.replace(/_/g, ' '),
    });
  }

  let resupply = dedupePois(
    resupplyFromOverpass.sort((a, b) => a.name.localeCompare(b.name)),
    3,
  ).slice(0, 40);

  if (resupply.length === 0) {
    try {
      const nominatimTowns = dedupePois(await fetchTownsNominatim(waypoints), 3).slice(0, 40);
      resupply = nominatimTowns;
    } catch {
      // Route still saves without POIs
    }
  }

  return {
    resupply,
    water: dedupePois(water, 1.5).slice(0, 80),
  };
}
