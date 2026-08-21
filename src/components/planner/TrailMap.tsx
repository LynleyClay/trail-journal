'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  CircleMarker,
} from 'react-leaflet';
import type { Waypoint } from '@/lib/routes';
import {
  LONG_TRAILS,
  trailPositions,
  type LongTrail,
} from '@/lib/long-trails';
import { TOPO_TILE_ATTRIBUTION, TOPO_TILE_URL, fixLeafletIcons } from '@/lib/leaflet-config';
import { guideStopIcon } from '@/lib/map-poi-icons';
import { getGuideStopsForTrails, getTrailGuide } from '@/lib/trail-guides';
import { InvalidateMapOnResize } from '@/components/map/InvalidateMapOnResize';
import {
  HOLD_MS,
  holdMovedTooFar,
  isDoubleTap,
  isMapChromeTarget,
  type PlacePoint,
} from '@/lib/map-place-gestures';
import 'leaflet/dist/leaflet.css';

function blazeIcon(index: number, isEnd: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'blaze-marker',
    html: `<span class="blaze-marker__dot ${isEnd ? 'blaze-marker__dot--end' : ''}">${index + 1}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitMap({
  waypoints,
  fitKey,
  showAllTrails,
}: {
  waypoints: Waypoint[];
  fitKey: number;
  showAllTrails: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    if (waypoints.length >= 2) {
      const bounds = L.latLngBounds(
        waypoints.map((w) => [w.lat, w.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      return;
    }
    if (waypoints.length === 1) {
      const first = waypoints[0];
      if (first) map.setView([first.lat, first.lng], Math.max(map.getZoom(), 12));
      return;
    }
    if (showAllTrails) {
      const all = LONG_TRAILS.flatMap((t) =>
        t.path.map((p) => [p.lat, p.lng] as [number, number]),
      );
      map.fitBounds(L.latLngBounds(all), { padding: [36, 36] });
    }
    // Only refit when asked (clear / initial load). Pin drops must not steal the user's zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);

  return null;
}

function FlyToPoint({
  lat,
  lng,
  zoom,
  focusKey,
}: {
  lat: number;
  lng: number;
  zoom: number;
  focusKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (focusKey === 0) return;
    map.setView([lat, lng], zoom);
  }, [map, lat, lng, zoom, focusKey]);
  return null;
}

function PlacePinGestures({
  enabled,
  onAdd,
}: {
  enabled: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const lastTap = useRef<PlacePoint | null>(null);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const panning = useRef(false);
  const ignoreUntil = useRef(0);
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;

  useEffect(() => {
    if (!enabled) return;
    const container = map.getContainer();

    const clearHold = () => {
      if (holdTimer.current != null) {
        window.clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      holdStart.current = null;
    };

    const place = (lat: number, lng: number) => {
      clearHold();
      lastTap.current = null;
      ignoreUntil.current = Date.now() + 450;
      onAddRef.current(lat, lng);
    };

    const pointFromEvent = (event: PointerEvent) => {
      const latlng = map.mouseEventToLatLng(event);
      const pixel = map.mouseEventToContainerPoint(event);
      return {
        lat: latlng.lat,
        lng: latlng.lng,
        x: pixel.x,
        y: pixel.y,
        time: Date.now(),
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (isMapChromeTarget(event.target)) return;
      const point = pointFromEvent(event);
      panning.current = false;
      holdStart.current = point;
      holdTimer.current = window.setTimeout(() => {
        if (!holdStart.current || panning.current) return;
        place(holdStart.current.lat, holdStart.current.lng);
      }, HOLD_MS);
    };

    const onPointerMove = (event: PointerEvent) => {
      const start = holdStart.current;
      if (!start) return;
      const pixel = map.mouseEventToContainerPoint(event);
      if (holdMovedTooFar(start, pixel)) {
        panning.current = true;
        clearHold();
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = holdStart.current;
      const wasPanning = panning.current;
      clearHold();
      if (wasPanning || Date.now() < ignoreUntil.current) return;
      if (isMapChromeTarget(event.target)) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const point = pointFromEvent(event);
      if (isDoubleTap(lastTap.current, point)) {
        place(point.lat, point.lng);
        return;
      }
      lastTap.current = point;
    };

    const onContextMenu = (event: Event) => {
      event.preventDefault();
      if (isMapChromeTarget(event.target)) return;
      if (Date.now() < ignoreUntil.current) return;
      const start = holdStart.current;
      if (start) place(start.lat, start.lng);
    };

    const onDragStart = () => {
      panning.current = true;
      clearHold();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointercancel', clearHold);
    container.addEventListener('contextmenu', onContextMenu);
    map.on('dragstart', onDragStart);
    return () => {
      clearHold();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', clearHold);
      container.removeEventListener('contextmenu', onContextMenu);
      map.off('dragstart', onDragStart);
    };
  }, [map, enabled]);

  return null;
}

function TrailLayer({
  trail,
  connected,
  highlighted,
  onHover,
}: {
  trail: LongTrail;
  connected: boolean;
  highlighted: boolean;
  onHover: (id: string | null) => void;
}) {
  const positions = useMemo(() => trailPositions(trail), [trail]);
  const weight = connected ? 6 : highlighted ? 5 : 3.5;
  const opacity = connected ? 0.98 : highlighted ? 0.95 : 0.82;

  const handlers = {
    mouseover: () => onHover(trail.id),
    mouseout: () => onHover(null),
  };

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: trail.color,
          weight,
          opacity,
          lineCap: 'round',
          lineJoin: 'round',
        }}
        eventHandlers={handlers}
      />
      <Polyline
        positions={positions}
        pathOptions={{ color: trail.color, weight: 14, opacity: 0 }}
        eventHandlers={handlers}
      />
      {trail.path.length > 0 && (() => {
        const start = trail.path[0]!;
        const end = trail.path[trail.path.length - 1]!;
        return (
        <>
          <CircleMarker
            center={[start.lat, start.lng]}
            radius={connected || highlighted ? 6 : 4}
            pathOptions={{
              color: '#fff',
              weight: 1.5,
              fillColor: trail.color,
              fillOpacity: 0.9,
            }}
            eventHandlers={handlers}
          >
            <Popup>
              <strong>
                {trail.abbrev} · {trail.name}
              </strong>
              <p className="text-sm mt-1">
                {trail.termini[0]} → {trail.termini[1]}
              </p>
              <p className="text-sm text-stone-500">
                {trail.miles.toLocaleString()} mi · double-tap or hold two points for a stretch
              </p>
            </Popup>
          </CircleMarker>
          <CircleMarker
            center={[end.lat, end.lng]}
            radius={connected || highlighted ? 6 : 4}
            pathOptions={{
              color: '#fff',
              weight: 1.5,
              fillColor: trail.color,
              fillOpacity: 0.9,
            }}
            eventHandlers={handlers}
          />
        </>
        );
      })()}
    </>
  );
}

type TrailMapProps = {
  waypoints: Waypoint[];
  defaultCenter: [number, number];
  connectedTrailIds: string[];
  selectedTrailId: string | null;
  showGuideStops: boolean;
  highlightedTrailId: string | null;
  onAddWaypoint: (lat: number, lng: number) => void;
  onMoveWaypoint: (id: string, lat: number, lng: number) => void;
  onHoverTrail: (id: string | null) => void;
  fitKey: number;
  focusPoint?: { lat: number; lng: number; key: number };
};

export function TrailMap({
  waypoints,
  defaultCenter,
  connectedTrailIds,
  selectedTrailId,
  showGuideStops,
  highlightedTrailId,
  onAddWaypoint,
  onMoveWaypoint,
  onHoverTrail,
  fitKey,
  focusPoint,
}: TrailMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const positions = useMemo(
    () => waypoints.map((w) => [w.lat, w.lng] as [number, number]),
    [waypoints],
  );

  const sortedTrails = useMemo(() => {
    return [...LONG_TRAILS].sort((a, b) => {
      const ac = connectedTrailIds.includes(a.id) ? 1 : 0;
      const bc = connectedTrailIds.includes(b.id) ? 1 : 0;
      return ac - bc;
    });
  }, [connectedTrailIds]);

  const guideStopTrailIds = useMemo(() => {
    const ids = new Set<string>(connectedTrailIds);
    if (selectedTrailId && showGuideStops) ids.add(selectedTrailId);
    return [...ids].filter((id) => getTrailGuide(id));
  }, [connectedTrailIds, selectedTrailId, showGuideStops]);

  const guideStops = useMemo(
    () => getGuideStopsForTrails(guideStopTrailIds),
    [guideStopTrailIds],
  );

  return (
    <MapContainer
      center={defaultCenter}
      zoom={4}
      className="h-full w-full"
      scrollWheelZoom
      doubleClickZoom={false}
    >
      <TileLayer attribution={TOPO_TILE_ATTRIBUTION} url={TOPO_TILE_URL} maxZoom={17} />
      <InvalidateMapOnResize />
      <FitMap waypoints={waypoints} fitKey={fitKey} showAllTrails={waypoints.length === 0} />
      {focusPoint && focusPoint.key > 0 && (
        <FlyToPoint
          lat={focusPoint.lat}
          lng={focusPoint.lng}
          zoom={11}
          focusKey={focusPoint.key}
        />
      )}
      <PlacePinGestures enabled onAdd={onAddWaypoint} />

      {sortedTrails.map((trail) => (
        <TrailLayer
          key={trail.id}
          trail={trail}
          connected={connectedTrailIds.includes(trail.id)}
          highlighted={highlightedTrailId === trail.id || selectedTrailId === trail.id}
          onHover={onHoverTrail}
        />
      ))}

      {guideStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={guideStopIcon(stop.kind)}
          zIndexOffset={stop.kind === 'highlight' ? 1300 : stop.kind === 'resupply' ? 1200 : 1100}
        >
          <Popup>
            <div className="min-w-[160px]">
              <strong>{stop.name}</strong>
              <p className="text-xs text-stone-500 mt-0.5 capitalize">{stop.kind}</p>
              {stop.mile != null && (
                <p className="text-xs text-stone-500">~Mile {stop.mile.toLocaleString()}</p>
              )}
              <p className="text-sm text-stone-600 mt-1">{stop.note}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#E85D04',
            weight: 4,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {waypoints.map((w, i) => {
        if (w.kind === 'shape') return null;
        const stopIndex = waypoints.slice(0, i + 1).filter((p) => p.kind !== 'shape').length - 1;
        const stopCount = waypoints.filter((p) => p.kind !== 'shape').length;
        return (
        <Marker
          key={w.id}
          position={[w.lat, w.lng]}
          icon={blazeIcon(stopIndex, stopIndex === 0 || stopIndex === stopCount - 1)}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as import('leaflet').Marker;
              const { lat, lng } = m.getLatLng();
              onMoveWaypoint(w.id, lat, lng);
            },
          }}
        >
          <Popup>
            <strong>{w.name}</strong>
            {w.note ? <p className="text-sm mt-1">{w.note}</p> : null}
          </Popup>
        </Marker>
        );
      })}
    </MapContainer>
  );
}
