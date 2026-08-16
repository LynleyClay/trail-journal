import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createActiveRoute, getActiveRoutes } from '@/lib/active-routes';
import type { Waypoint } from '@/lib/routes';
import { fetchRoutePois } from '@/lib/overpass';

function validateWaypoints(raw: unknown): raw is Waypoint[] {
  if (!Array.isArray(raw) || raw.length < 2) return false;
  return raw.every(
    (w) =>
      w &&
      typeof w === 'object' &&
      typeof (w as Waypoint).id === 'string' &&
      typeof (w as Waypoint).name === 'string' &&
      typeof (w as Waypoint).lat === 'number' &&
      typeof (w as Waypoint).lng === 'number',
  );
}

export async function GET(): Promise<NextResponse> {
  const routes = await getActiveRoutes();
  return NextResponse.json({ routes });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const { name, waypoints, connectedTrailIds } = data;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!validateWaypoints(waypoints)) {
    return NextResponse.json({ error: 'waypoints must be an array of at least 2 points' }, { status: 400 });
  }
  if (!Array.isArray(connectedTrailIds)) {
    return NextResponse.json({ error: 'connectedTrailIds must be an array' }, { status: 400 });
  }

  try {
    let resupply: Awaited<ReturnType<typeof fetchRoutePois>>['resupply'] = [];
    let water: Awaited<ReturnType<typeof fetchRoutePois>>['water'] = [];
    try {
      const pois = await fetchRoutePois(waypoints);
      resupply = pois.resupply;
      water = pois.water;
    } catch (poiErr) {
      console.error('POI lookup failed, saving route without towns/water:', poiErr);
    }
    const route = await createActiveRoute({
      name,
      waypoints,
      connectedTrailIds: connectedTrailIds as string[],
      resupply,
      water,
    });
    revalidateTag('active-routes-data', { expire: 0 });
    return NextResponse.json({ route }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
