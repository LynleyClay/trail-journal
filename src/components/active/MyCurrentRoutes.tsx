'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ActiveRoute } from '@/lib/active-routes';
import { routeStats } from '@/lib/routes';
import {
  filterPoisNearRoute,
  formatTownType,
  formatWaterType,
  distanceToRouteMiles,
} from '@/lib/route-proximity';
import { ActiveRouteMap } from './ActiveRouteMap';
import { useLiveGps } from './useLiveGps';

const TOWN_MAX_MI = 8;
const WATER_MAX_MI = 0.5;

function poiCount(route: ActiveRoute): number {
  return (
    filterPoisNearRoute(route.resupply, route.waypoints, TOWN_MAX_MI).length +
    filterPoisNearRoute(route.water, route.waypoints, WATER_MAX_MI).length
  );
}

function pickDefaultRouteId(routes: ActiveRoute[], preferredId?: string | null): string | null {
  if (routes.length === 0) return null;
  if (preferredId && routes.some((r) => r.id === preferredId)) return preferredId;
  const withPois = routes.find((r) => poiCount(r) > 0);
  return withPois?.id ?? routes[0]?.id ?? null;
}

type MyCurrentRoutesProps = {
  defaultCenter: [number, number];
  initialRouteId?: string | null;
};

export default function MyCurrentRoutes({ defaultCenter, initialRouteId }: MyCurrentRoutesProps) {
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialRouteId ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackGps, setTrackGps] = useState(false);
  const [refreshingPois, setRefreshingPois] = useState(false);

  const selected = routes.find((r) => r.id === selectedId) ?? null;
  const { position: gps, error: gpsError, watching } = useLiveGps(trackGps && !!selected);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/routes');
      if (!res.ok) throw new Error('Failed to load routes');
      const data = (await res.json()) as { routes: ActiveRoute[] };
      setRoutes(data.routes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    if (routes.length === 0) return;
    setSelectedId((current) => pickDefaultRouteId(routes, initialRouteId ?? current));
  }, [routes, initialRouteId]);

  const refreshPois = async (id: string) => {
    setRefreshingPois(true);
    setError(null);
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshPois: true }),
      });
      const data = (await res.json()) as { route?: ActiveRoute; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to find towns and water');
      if (data.route) {
        setRoutes((prev) => prev.map((r) => (r.id === id ? data.route! : r)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find towns and water');
    } finally {
      setRefreshingPois(false);
    }
  };

  const removeRoute = async (id: string) => {
    if (!confirm('Remove this route from My Current Routes?')) return;
    const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setTrackGps(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-stone-500 text-sm">
        Loading your routes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-600 text-sm px-4">
        {error}
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-stone-500 text-sm px-6 text-center">
        No approved routes yet. Build a route in <strong className="mx-1">Plan Routes</strong> and
        click <strong className="mx-1">Approve route</strong> to start tracking.
      </div>
    );
  }

  const stats = selected ? routeStats(selected.waypoints) : null;
  const nearbyTowns = selected
    ? filterPoisNearRoute(selected.resupply, selected.waypoints, TOWN_MAX_MI)
    : [];
  const nearbyWater = selected
    ? filterPoisNearRoute(selected.water, selected.waypoints, WATER_MAX_MI)
    : [];

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-50 p-4 flex flex-col gap-3 min-h-0 max-h-[40vh] lg:max-h-none overflow-y-auto">
        <p className="text-sm font-medium text-stone-900">Approved routes</p>
        <ul className="space-y-2">
          {routes.map((route) => (
            <li key={route.id}>
              <button
                type="button"
                onClick={() => setSelectedId(route.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                  selectedId === route.id
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <span className="font-medium text-stone-900">{route.name}</span>
                <span className="block text-xs text-stone-500">
                  {filterPoisNearRoute(route.resupply, route.waypoints, TOWN_MAX_MI).length} towns ·{' '}
                  {filterPoisNearRoute(route.water, route.waypoints, WATER_MAX_MI).length} water near
                  trail
                </span>
              </button>
            </li>
          ))}
        </ul>

        {selected && stats && (
          <div className="rounded-lg border border-stone-200 bg-white p-3 text-sm space-y-2">
            <p>
              <span className="font-medium">{stats.miles.toFixed(0)} mi</span>
              <span className="text-stone-500"> · {stats.stops} stops</span>
            </p>
            <p className="text-xs text-stone-500">
              Showing stops within {TOWN_MAX_MI} mi (towns) or {WATER_MAX_MI} mi (water) of your
              route. Tap icons on the map for details.
            </p>

            {nearbyTowns.length === 0 && nearbyWater.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 space-y-2">
                <p className="text-xs text-amber-900">
                  No towns or water on the map yet for this route. This can happen on long routes if
                  the first lookup timed out.
                </p>
                <button
                  type="button"
                  onClick={() => refreshPois(selected.id)}
                  disabled={refreshingPois}
                  className="text-xs font-medium text-amber-900 underline disabled:opacity-50"
                >
                  {refreshingPois ? 'Searching for towns and water…' : 'Find towns & water on map'}
                </button>
              </div>
            )}

            {nearbyTowns.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2">
                <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                  <span className="inline-flex poi-marker__badge poi-marker__badge--town scale-75 origin-left">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path fill="currentColor" d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/>
                    </svg>
                  </span>
                  Towns near trail ({nearbyTowns.length})
                </p>
                <ul className="text-xs text-stone-700 max-h-28 overflow-y-auto space-y-1">
                  {nearbyTowns.map((poi) => (
                    <li key={poi.id}>
                      <span className="font-medium">{poi.name}</span>
                      <span className="text-stone-500">
                        {' '}
                        · {formatTownType(poi.detail)} · ~
                        {distanceToRouteMiles(poi, selected.waypoints).toFixed(1)} mi
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {nearbyWater.length > 0 && (
              <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-2">
                <p className="text-xs font-semibold text-sky-800 mb-1 flex items-center gap-1">
                  <span className="inline-flex poi-marker__badge poi-marker__badge--water scale-75 origin-left">
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path fill="currentColor" d="M12 2.5c-2.2 3.5-6 8.1-6 12a6 6 0 1 0 12 0c0-3.9-3.8-8.5-6-12z"/>
                    </svg>
                  </span>
                  Water near trail ({nearbyWater.length})
                </p>
                <ul className="text-xs text-stone-700 max-h-28 overflow-y-auto space-y-1">
                  {nearbyWater.map((poi) => (
                    <li key={poi.id}>
                      <span className="font-medium">{poi.name || formatWaterType(poi.detail)}</span>
                      <span className="text-stone-500">
                        {' '}
                        · {formatWaterType(poi.detail)} · ~
                        {distanceToRouteMiles(poi, selected.waypoints).toFixed(1)} mi
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(nearbyTowns.length > 0 || nearbyWater.length > 0) && (
              <button
                type="button"
                onClick={() => refreshPois(selected.id)}
                disabled={refreshingPois}
                className="text-xs text-stone-600 hover:underline disabled:opacity-50"
              >
                {refreshingPois ? 'Updating map markers…' : 'Refresh towns & water'}
              </button>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={trackGps}
                onChange={(e) => setTrackGps(e.target.checked)}
                className="rounded border-stone-300"
              />
              <span>Track my location (GPS)</span>
            </label>
            {trackGps && (
              <p className="text-xs text-stone-500">
                {watching && gps
                  ? `Location active · ±${Math.round(gps.accuracy)}m`
                  : gpsError ?? 'Waiting for GPS…'}
              </p>
            )}
            {trackGps && (
              <p className="text-xs text-amber-700">
                Keep this page open on your phone while hiking. Works best over HTTPS.
              </p>
            )}
            <button
              type="button"
              onClick={() => removeRoute(selected.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove route
            </button>
          </div>
        )}
      </aside>

      <section className="flex-1 relative min-h-[280px] lg:min-h-0">
        {selected ? (
          <>
            <ActiveRouteMap
              route={selected}
              gps={gps}
              defaultCenter={defaultCenter}
              trackGps={trackGps}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap justify-center gap-2 pointer-events-none px-2">
              <span className="rounded-full bg-blue-700/95 text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5 shadow">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path fill="currentColor" d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z"/>
                </svg>
                Town
              </span>
              <span className="rounded-full bg-sky-600/95 text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5 shadow">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path fill="currentColor" d="M12 2.5c-2.2 3.5-6 8.1-6 12a6 6 0 1 0 12 0c0-3.9-3.8-8.5-6-12z"/>
                </svg>
                Water
              </span>
              {trackGps && watching && (
                <span className="rounded-full bg-green-600/90 text-white text-xs px-3 py-1">
                  You
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-stone-500 text-sm">
            Select a route
          </div>
        )}
      </section>
    </div>
  );
}
