'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  LONG_TRAILS,
  appendTrailToRoute,
  getTrailById,
} from '@/lib/long-trails';
import { routeStats, uid, type Waypoint } from '@/lib/routes';
import { TrailCatalog } from './TrailCatalog';
import { TrailGuidePanel } from './TrailGuidePanel';
import { RouteGuideInsight } from './RouteGuideInsight';
import { TrailMap } from './TrailMap';
import { WaypointList } from './WaypointList';
import { getTrailGuide } from '@/lib/trail-guides';

type BuildMode = 'connect' | 'pin';

type RoutePlannerProps = {
  defaultCenter: [number, number];
  onRouteApproved?: (routeId: string) => void;
};

export default function RoutePlanner({ defaultCenter, onRouteApproved }: RoutePlannerProps) {
  const [routeName, setRouteName] = useState('My route');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [connectedTrailIds, setConnectedTrailIds] = useState<string[]>([]);
  const [mode, setMode] = useState<BuildMode>('connect');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [showGuideStopsOnMap, setShowGuideStopsOnMap] = useState(true);
  const [highlightedTrailId, setHighlightedTrailId] = useState<string | null>(null);
  const [trailFilter, setTrailFilter] = useState('');
  const [fitKey, setFitKey] = useState(0);
  const [status, setStatus] = useState<string | null>(
    'Click a trail to read its guide, then add it to your route.',
  );
  const [sidebarTab, setSidebarTab] = useState<'trails' | 'route'>('trails');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const stats = useMemo(() => routeStats(waypoints), [waypoints]);

  const clearRoute = useCallback(() => {
    setWaypoints([]);
    setConnectedTrailIds([]);
    setSelectedId(null);
    setSelectedTrailId(null);
    setRouteName('My route');
    setMode('connect');
    setStatus('Route cleared. Click trails to connect a new line.');
    setFitKey((k) => k + 1);
    setSidebarTab('trails');
  }, []);

  const selectTrail = useCallback((trailId: string) => {
    const trail = getTrailById(trailId);
    if (!trail) return;
    setSelectedTrailId(trailId);
    setHighlightedTrailId(trailId);
    setSidebarTab('trails');
    setStatus(`Viewing ${trail.name}. Add it to your route when ready.`);
  }, []);

  const connectTrail = useCallback((trailId: string) => {
    const trail = getTrailById(trailId);
    if (!trail) return;

    setConnectedTrailIds((prevIds) => {
      if (prevIds.includes(trailId)) {
        setStatus(
          `${trail.abbrev} is already in your route. Undo, clear, or connect a different trail.`,
        );
        return prevIds;
      }

      setWaypoints((prevWps) => {
        const { waypoints: next, gapMiles } = appendTrailToRoute(prevWps, trail);
        if (prevWps.length === 0) {
          setStatus(
            `Started on ${trail.name}. Click another trail to connect from the open end.`,
          );
        } else if (gapMiles > 0) {
          setStatus(
            `Connected ${trail.abbrev} with a ~${gapMiles.toFixed(0)} mi link from your last point.`,
          );
        } else {
          setStatus(`Joined ${trail.name} at the near terminus.`);
        }
        setSelectedId(next[next.length - 1]?.id ?? null);
        setSidebarTab('route');
        return next;
      });

      return [...prevIds, trailId];
    });
    setSelectedTrailId(trailId);
    setHighlightedTrailId(trailId);
  }, []);

  const addWaypoint = useCallback((lat: number, lng: number) => {
    const point: Waypoint = {
      id: uid(),
      name: `Pin ${Date.now().toString().slice(-4)}`,
      lat,
      lng,
    };
    setWaypoints((prev) => [...prev, point]);
    setSelectedId(point.id);
    setStatus('Pinned a custom waypoint.');
    setSidebarTab('route');
  }, []);

  const moveWaypoint = useCallback((id: string, lat: number, lng: number) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, lat, lng } : w)));
  }, []);

  const renameWaypoint = useCallback((id: string, name: string) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const reorder = useCallback((id: string, dir: -1 | 1) => {
    setWaypoints((prev) => {
      const i = prev.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const a = next[i];
      const b = next[j];
      if (a && b) {
        next[i] = b;
        next[j] = a;
      }
      return next;
    });
  }, []);

  const undoLastTrail = useCallback(() => {
    setConnectedTrailIds((ids) => {
      if (ids.length === 0) return ids;
      const removedId = ids[ids.length - 1];
      if (!removedId) return ids;
      const removed = getTrailById(removedId);
      setWaypoints(() => {
        const remaining = ids.slice(0, -1);
        if (remaining.length === 0) return [];
        let built: Waypoint[] = [];
        for (const id of remaining) {
          const t = getTrailById(id);
          if (!t) continue;
          built = appendTrailToRoute(built, t).waypoints;
        }
        return built;
      });
      setStatus(
        removed ? `Removed ${removed.abbrev} from the end of your route.` : 'Removed last trail.',
      );
      return ids.slice(0, -1);
    });
  }, []);

  const exportGeoJson = useCallback(() => {
    const geo = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: routeName, trails: connectedTrailIds },
          geometry: {
            type: 'LineString',
            coordinates: waypoints.map((w) => [w.lng, w.lat]),
          },
        },
        ...waypoints.map((w, i) => ({
          type: 'Feature',
          properties: { name: w.name, order: i + 1, note: w.note ?? null },
          geometry: { type: 'Point', coordinates: [w.lng, w.lat] },
        })),
      ],
    };
    const blob = new Blob([JSON.stringify(geo, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName.replace(/\s+/g, '-').toLowerCase()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }, [routeName, waypoints, connectedTrailIds]);

  const approveRoute = useCallback(async () => {
    if (waypoints.length < 2) return;
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: routeName,
          waypoints,
          connectedTrailIds,
        }),
      });
      const data = (await res.json()) as { route?: { id: string }; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to approve route');
      }
      if (data.route?.id) {
        setStatus('Route approved! Finding resupply towns and water sources…');
        onRouteApproved?.(data.route.id);
      }
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Failed to approve route');
    } finally {
      setApproving(false);
    }
  }, [routeName, waypoints, connectedTrailIds, onRouteApproved]);

  const selectedTrail = selectedTrailId ? getTrailById(selectedTrailId) : null;
  const selectedGuide = selectedTrailId ? getTrailGuide(selectedTrailId) : null;
  const connectedTrailOrder =
    selectedTrailId && connectedTrailIds.includes(selectedTrailId)
      ? connectedTrailIds.indexOf(selectedTrailId) + 1
      : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 shrink-0 flex flex-wrap items-center gap-3">
        <input
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium min-w-[140px] max-w-[220px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          aria-label="Route name"
        />
        <div className="flex flex-wrap gap-2 text-sm text-stone-600">
          <span className="rounded-full bg-white border border-stone-200 px-2.5 py-1">
            {connectedTrailIds.length} trails
          </span>
          <span className="rounded-full bg-white border border-stone-200 px-2.5 py-1">
            {stats.stops} stops
          </span>
          <span className="rounded-full bg-white border border-stone-200 px-2.5 py-1">
            {stats.miles.toFixed(0)} mi
          </span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <aside
          className={`w-full lg:w-80 xl:w-96 shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-50 flex flex-col min-h-0 ${
            selectedTrail ? 'max-h-[min(70vh,720px)] lg:max-h-none' : 'max-h-[45vh] lg:max-h-none'
          }`}
        >
          <div className="shrink-0 p-4 pb-2 flex flex-col gap-3">
            <div className="flex gap-2" role="group" aria-label="Build mode">
              <button
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  mode === 'connect' ? 'bg-emerald-600 text-white' : 'bg-white border border-stone-300 text-stone-700'
                }`}
                onClick={() => {
                  setMode('connect');
                  setStatus('Connect mode: click a trail to view its guide, then add to route.');
                }}
              >
                Connect trails
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  mode === 'pin' ? 'bg-emerald-600 text-white' : 'bg-white border border-stone-300 text-stone-700'
                }`}
                onClick={() => {
                  setMode('pin');
                  setStatus('Pin mode: click the map to drop custom waypoints.');
                }}
              >
                Pin waypoints
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40"
                onClick={undoLastTrail}
                disabled={connectedTrailIds.length === 0}
              >
                Undo trail
              </button>
              <button
                type="button"
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100"
                onClick={clearRoute}
              >
                Clear
              </button>
              <button
                type="button"
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40"
                onClick={exportGeoJson}
                disabled={waypoints.length < 2}
              >
                Export GeoJSON
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
                onClick={approveRoute}
                disabled={waypoints.length < 2 || approving}
              >
                {approving ? 'Approving…' : 'Approve route'}
              </button>
            </div>

            {approveError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 px-3 py-2">
                {approveError}
              </p>
            )}

            {status && !selectedTrail && (
              <p className="text-sm text-stone-600 bg-white rounded-lg border border-stone-200 px-3 py-2" role="status">
                {status}
              </p>
            )}

            {connectedTrailIds.length > 0 && !selectedTrail && (
              <div className="flex flex-wrap gap-1.5">
                {connectedTrailIds.map((id, i) => {
                  const t = getTrailById(id);
                  if (!t) return null;
                  return (
                    <span
                      key={`${id}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-white border border-stone-200 px-2 py-1 text-xs font-medium"
                    >
                      <i className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                      {t.abbrev}
                      {i < connectedTrailIds.length - 1 ? ' →' : ''}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex gap-1 border-b border-stone-200 pb-2">
              <button
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  sidebarTab === 'trails' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
                }`}
                onClick={() => setSidebarTab('trails')}
              >
                Long trails ({LONG_TRAILS.length})
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
                  sidebarTab === 'route' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500'
                }`}
                onClick={() => setSidebarTab('route')}
              >
                Your route
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
            {sidebarTab === 'trails' ? (
              selectedTrail ? (
                <TrailGuidePanel
                  trail={selectedTrail}
                  guide={selectedGuide}
                  connectedOrder={connectedTrailOrder}
                  showStopsOnMap={showGuideStopsOnMap}
                  routeWaypoints={waypoints}
                  onBack={() => {
                    setSelectedTrailId(null);
                    setStatus('Click a trail to read its guide.');
                  }}
                  onConnect={() => connectTrail(selectedTrail.id)}
                  onToggleShowStops={() => setShowGuideStopsOnMap((v) => !v)}
                />
              ) : (
                <TrailCatalog
                  trails={LONG_TRAILS}
                  connectedIds={connectedTrailIds}
                  selectedId={selectedTrailId}
                  highlightedId={highlightedTrailId}
                  onSelect={selectTrail}
                  onHover={setHighlightedTrailId}
                  filter={trailFilter}
                  onFilterChange={setTrailFilter}
                />
              )
            ) : waypoints.length === 0 ? (
              <p className="text-sm text-stone-500">
                No route yet. Switch to Long trails, pick a trail for its guide, then add it to your
                route.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <RouteGuideInsight connectedTrailIds={connectedTrailIds} />
                <WaypointList
                  waypoints={waypoints}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onRename={renameWaypoint}
                  onRemove={removeWaypoint}
                  onMoveUp={(id) => reorder(id, -1)}
                  onMoveDown={(id) => reorder(id, 1)}
                />
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 relative min-h-[300px] lg:min-h-0">
          <TrailMap
            waypoints={waypoints}
            defaultCenter={defaultCenter}
            addMode={mode === 'pin'}
            connectMode={mode === 'connect'}
            connectedTrailIds={connectedTrailIds}
            selectedTrailId={selectedTrailId}
            showGuideStops={showGuideStopsOnMap}
            highlightedTrailId={highlightedTrailId}
            onAddWaypoint={addWaypoint}
            onMoveWaypoint={moveWaypoint}
            onSelectTrail={selectTrail}
            onHoverTrail={setHighlightedTrailId}
            fitKey={fitKey}
          />
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-stone-900/85 text-white text-sm px-4 py-2 pointer-events-none"
            role="status"
          >
            {mode === 'connect'
              ? selectedTrailId
                ? `${getTrailById(selectedTrailId)?.name ?? ''} — open guide in sidebar to add`
                : highlightedTrailId
                  ? `${getTrailById(highlightedTrailId)?.name ?? ''} — click to view guide`
                  : 'Click a trail to view its guide'
              : 'Click anywhere to place a waypoint'}
          </div>
        </section>
      </div>
    </div>
  );
}
