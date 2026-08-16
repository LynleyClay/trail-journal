import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import {
  deleteActiveRoute,
  getActiveRouteById,
  updateActiveRoutePois,
  updateActiveRouteStatus,
} from '@/lib/active-routes';
import { fetchRoutePois } from '@/lib/overpass';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const ok = await deleteActiveRoute(id);
  if (!ok) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
  revalidateTag('active-routes-data', { expire: 0 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const status = data.status;
  const refreshPois = data.refreshPois === true;

  if (refreshPois) {
    const existing = await getActiveRouteById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    try {
      const pois = await fetchRoutePois(existing.waypoints);
      const route = await updateActiveRoutePois(id, pois.resupply, pois.water);
      revalidateTag('active-routes-data', { expire: 0 });
      return NextResponse.json({ route });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh POIs';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (status !== 'active' && status !== 'completed') {
    return NextResponse.json(
      { error: 'status must be active or completed, or set refreshPois: true' },
      { status: 400 },
    );
  }

  const route = await updateActiveRouteStatus(id, status);
  if (!route) {
    return NextResponse.json({ error: 'Route not found' }, { status: 404 });
  }
  revalidateTag('active-routes-data', { expire: 0 });
  return NextResponse.json({ route });
}
