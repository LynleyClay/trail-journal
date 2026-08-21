import { NextRequest, NextResponse } from 'next/server';
import {
  buildElevationProfile,
  sampleRouteForElevation,
  type LatLng,
} from '@/lib/elevation';
import { fetchElevationsMeters } from '@/lib/elevation-fetch';

function parsePoints(raw: unknown): LatLng[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const points: LatLng[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const lat = (item as { lat?: unknown }).lat;
    const lng = (item as { lng?: unknown }).lng;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    points.push({ lat, lng });
  }
  return points;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const points = parsePoints(data.waypoints) ?? parsePoints(data.points);
  if (!points) {
    return NextResponse.json({ error: 'waypoints must be an array of at least 2 lat/lng points' }, { status: 400 });
  }

  try {
    const sampled = sampleRouteForElevation(points);
    const meters = await fetchElevationsMeters(sampled);
    const profile = buildElevationProfile(sampled, meters);
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Elevation lookup failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
