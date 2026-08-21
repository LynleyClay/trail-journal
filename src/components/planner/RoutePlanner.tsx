'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  LONG_TRAILS,
  SNAP_TO_TRAIL_MILES,
  appendTrailPin,
  appendTrailToRoute,
  getTrailById,
  nearestTrailSnap,
  snapToTrail,
  uniqueTrailIds,
} from '@/lib/long-trails';
import { routeStats, uid, type Waypoint } from '@/lib/routes';
import { appendRoutedPin, requestWalkPath, shouldTryWalkPath } from '@/lib/walk-path';
import { TrailCatalog } from './TrailCatalog';
import { TrailGuidePanel } from './TrailGuidePanel';
import { RouteGuideInsight } from './RouteGuideInsight';
import { TrailMap } from './TrailMap';
import { WaypointList } from './WaypointList';
import { LocationSearch } from './LocationSearch';
import { getTrailGuide } from '@/lib/trail-guides';
import type { GeocodeResult } from '@/lib/geocode';
import { ShowMapMenuButton } from '@/components/map/ShowMapMenuButton';

type RoutePlannerProps = {
  defaultCenter: [number, number];
  onRouteApproved?: (routeId: string) => void;
  mobileMenuOpen?: boolean;
  onShowMobileMenu?: () => void;
};

export default function RoutePlanner({
  defaultCenter,
  onRouteApproved,
  mobileMenuOpen = true,
  onShowMobileMenu,
}: RoutePlannerProps) {
  const [routeName, setRouteName] = useState('My route');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [actionSizes, setActionSizes] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [showGuideStopsOnMap, setShowGuideStopsOnMap] = useState(true);
  const [highlightedTrailId, setHighlightedTrailId] = useState<string | null>(null);
  const [trailFilter, setTrailFilter] = useState('');
  const [fitKey, setFitKey] = useState(0);
  const [mapFocus, setMapFocus] = useState({ lat: 0, lng: 0, key: 0 });
  const [status, setStatus] = useState<string | null>(
    'Double-tap or press and hold to drop a pin. Drag to move the map.',
  );
  const [sidebarTab, setSidebarTab] = useState<'trails' | 'route'>('trails');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [lookingForPath, setLookingForPath] = useState(false);
  const placingRef = useRef(false);

  const stats = useMemo(() => routeStats(waypoints), [waypoints]);
  const connectedTrailIds = useMemo(() => uniqueTrailIds(waypoints), [waypoints]);

  const recordAction = useCallback((added: number) => {
    if (added <= 0) return;
    setActionSizes((sizes) => [...sizes, added]);
  }, []);

  const clearRoute = useCallback(() => {
    setWaypoints([]);
    setActionSizes([]);
    setSelectedId(null);
    setSelectedTrailId(null);
    setRouteName('My route');
    setStatus('Route cleared. Double-tap or hold on a trail for a stretch, or on empty map for a custom pin.');
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

    setWaypoints((prevWps) => {
      const { waypoints: next, gapMiles } = appendTrailToRoute(prevWps, trail);
      const added = next.length - prevWps.length;
      recordAction(added);
      if (prevWps.length === 0) {
        setStatus(`Added the full ${trail.name}. Tap the trail to pin a shorter stretch next time.`);
      } else if (gapMiles > 0) {
        setStatus(
          `Connected full ${trail.abbrev} with a ~${gapMiles.toFixed(0)} mi link from your last point.`,
        );
      } else {
        setStatus(`Joined the full ${trail.name} at the near terminus.`);
      }
      setSelectedId(next[next.length - 1]?.id ?? null);
      setSidebarTab('route');
      return next;
    });
    setSelectedTrailId(trailId);
    setHighlightedTrailId(trailId);
  }, [recordAction]);

  const placePin = useCallback(
    async (lat: number, lng: number, opts?: { name?: string; trailId?: string }) => {
      if (placingRef.current) return;
      placingRef.current = true;

      try {
        const last = waypoints[waypoints.length - 1];
        const chosenTrail = opts?.trailId ? getTrailById(opts.trailId) : null;
        const snap = chosenTrail
          ? snapToTrail(chosenTrail, { lat, lng })
          : nearestTrailSnap({ lat, lng }, SNAP_TO_TRAIL_MILES);
        const destTrail = snap ? getTrailById(snap.trailId) : undefined;
        const destPoint = snap ?? { lat, lng };

        if (snap && last?.trailId === snap.trailId && destTrail) {
          setWaypoints((prev) => {
            const { waypoints: next, added, kind } = appendTrailPin(prev, destTrail, destPoint);
            if (added === 0) {
              setStatus(`That ${destTrail.abbrev} pin is too close to your last point.`);
              return prev;
            }
            recordAction(added);
            setSelectedId(next[next.length - 1]?.id ?? null);
            setSidebarTab('route');
            setStatus(
              kind === 'segment'
                ? `Using ${destTrail.abbrev} between your pins — not the full ${destTrail.miles.toLocaleString()} mi trail.`
                : `Pinned ${destTrail.abbrev}. Double-tap or hold further along it to take only that stretch.`,
            );
            return next;
          });
          setSelectedTrailId(destTrail.id);
          setHighlightedTrailId(destTrail.id);
          return;
        }

        let path: { lat: number; lng: number }[] = [];
        if (last && shouldTryWalkPath(last, destPoint)) {
          setLookingForPath(true);
          setStatus('Looking for a walkable path…');
          path = await requestWalkPath(last, destPoint);
        }

        const dest: Waypoint = destTrail
          ? {
              id: uid(destTrail.id),
              name: opts?.name?.trim() || `${destTrail.abbrev} pin`,
              lat: destPoint.lat,
              lng: destPoint.lng,
              note: destTrail.name,
              trailId: destTrail.id,
            }
          : {
              id: uid(),
              name: opts?.name?.trim() || `Pin ${Date.now().toString().slice(-4)}`,
              lat: destPoint.lat,
              lng: destPoint.lng,
            };

        setWaypoints((prev) => {
          const { waypoints: next, added, usedPath } = appendRoutedPin(prev, dest, path);
          recordAction(added);
          setSelectedId(dest.id);
          setSidebarTab('route');
          if (usedPath) {
            setStatus(
              destTrail
                ? `Followed a walkable path onto ${destTrail.abbrev}.`
                : 'Followed a walkable path between your pins.',
            );
          } else if (destTrail) {
            setStatus(
              last
                ? `Pinned ${destTrail.abbrev}. No walkable path found — straight line from your last pin.`
                : `Pinned ${destTrail.abbrev}. Double-tap or hold further along it to take only that stretch.`,
            );
          } else {
            setStatus(
              last && path.length === 0 && shouldTryWalkPath(last, destPoint)
                ? 'No walkable path found — dropped a straight-line pin.'
                : opts?.name
                  ? `Added ${opts.name} to your route.`
                  : 'Pinned a custom waypoint.',
            );
          }
          return next;
        });
        if (destTrail) {
          setSelectedTrailId(destTrail.id);
          setHighlightedTrailId(destTrail.id);
        }
      } finally {
        placingRef.current = false;
        setLookingForPath(false);
      }
    },
    [waypoints, recordAction],
  );

  const addWaypoint = useCallback((lat: number, lng: number, name?: string) => {
    void placePin(lat, lng, { name });
  }, [placePin]);

  const addWaypointFromSearch = useCallback(
    (place: GeocodeResult) => {
      addWaypoint(place.lat, place.lng, place.name);
      setMapFocus({ lat: place.lat, lng: place.lng, key: Date.now() });
    },
    [addWaypoint],
  );

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

  const undoLast = useCallback(() => {
    setActionSizes((sizes) => {
      if (sizes.length === 0) return sizes;
      const n = sizes[sizes.length - 1] ?? 0;
      setWaypoints((wps) => {
        const next = wps.slice(0, Math.max(0, wps.length - n));
        setSelectedId(next[next.length - 1]?.id ?? null);
        return next;
      });
      setStatus('Undid last pin or trail stretch.');
      return sizes.slice(0, -1);
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
      <div
        className={`border-b border-stone-200 bg-stone-50 px-4 py-2 shrink-0 flex flex-wrap items-center gap-3 ${
          mobileMenuOpen ? '' : 'hidden lg:flex'
        }`}
      >
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
          } ${mobileMenuOpen ? '' : 'hidden lg:flex'}`}
        >
          <div className="shrink-0 p-4 pb-2 flex flex-col gap-3">
            <p className="text-sm text-stone-600">
              Double-tap or press and hold to drop a pin (drag to pan). Near a trail, it snaps on.
              Hold again further along that trail for just that stretch.
            </p>

            <LocationSearch onSelect={addWaypointFromSearch} />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-40"
                onClick={undoLast}
                disabled={actionSizes.length === 0}
              >
                Undo
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
                No route yet. Double-tap or press and hold on a trail to pin a start, then again
                further along it for only that stretch. Empty map drops a custom pin.
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

        <section className={`flex-1 relative ${mobileMenuOpen ? 'min-h-[300px] lg:min-h-0' : 'min-h-0'}`}>
          <TrailMap
            waypoints={waypoints}
            defaultCenter={defaultCenter}
            connectedTrailIds={connectedTrailIds}
            selectedTrailId={selectedTrailId}
            showGuideStops={showGuideStopsOnMap}
            highlightedTrailId={highlightedTrailId}
            onAddWaypoint={addWaypoint}
            onMoveWaypoint={moveWaypoint}
            onHoverTrail={setHighlightedTrailId}
            fitKey={fitKey}
            focusPoint={mapFocus}
          />
          {!mobileMenuOpen && onShowMobileMenu && <ShowMapMenuButton onClick={onShowMobileMenu} />}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-stone-900/85 text-white text-sm px-4 py-2 pointer-events-none max-w-[min(92%,28rem)] text-center"
            role="status"
          >
            {lookingForPath
              ? 'Looking for a walkable path…'
              : highlightedTrailId
                ? `${getTrailById(highlightedTrailId)?.abbrev ?? ''} — double-tap or hold to pin, again for a stretch`
                : 'Double-tap or hold to pin · drag to move the map'}
          </div>
        </section>
      </div>
    </div>
  );
}
