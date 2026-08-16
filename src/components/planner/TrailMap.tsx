'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
  CircleMarker,
} from 'react-leaflet';
import type { Waypoint } from '@/lib/routes';
import {
  LONG_TRAILS,
  trailPositions,
  type LongTrail,
} from '@/lib/long-trails';
import { TOPO_TILE_ATTRIBUTION, TOPO_TILE_URL, fixLeafletIcons } from '@/lib/leaflet-config';
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
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 7 });
      return;
    }
    if (waypoints.length === 1) {
      const first = waypoints[0];
      if (first) map.setView([first.lat, first.lng], 8);
      return;
    }
    if (showAllTrails) {
      const all = LONG_TRAILS.flatMap((t) =>
        t.path.map((p) => [p.lat, p.lng] as [number, number]),
      );
      map.fitBounds(L.latLngBounds(all), { padding: [36, 36] });
    }
  }, [map, waypoints, fitKey, showAllTrails]);

  return null;
}

function ClickToAdd({
  enabled,
  onAdd,
}: {
  enabled: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function TrailLayer({
  trail,
  connected,
  highlighted,
  connectMode,
  onSelect,
  onHover,
}: {
  trail: LongTrail;
  connected: boolean;
  highlighted: boolean;
  connectMode: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const positions = useMemo(() => trailPositions(trail), [trail]);
  const weight = connected ? 6 : highlighted ? 5 : 3.5;
  const opacity = connected ? 0.98 : highlighted ? 0.95 : 0.82;

  const handlers = {
    click: (e: { originalEvent: Event }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require('leaflet') as typeof import('leaflet');
      L.DomEvent.stopPropagation(e as unknown as L.LeafletMouseEvent);
      if (connectMode) onSelect(trail.id);
    },
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
              <p className="text-sm text-stone-500">{trail.miles.toLocaleString()} mi · click to connect</p>
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
  addMode: boolean;
  connectMode: boolean;
  connectedTrailIds: string[];
  highlightedTrailId: string | null;
  onAddWaypoint: (lat: number, lng: number) => void;
  onMoveWaypoint: (id: string, lat: number, lng: number) => void;
  onSelectTrail: (id: string) => void;
  onHoverTrail: (id: string | null) => void;
  fitKey: number;
};

export function TrailMap({
  waypoints,
  defaultCenter,
  addMode,
  connectMode,
  connectedTrailIds,
  highlightedTrailId,
  onAddWaypoint,
  onMoveWaypoint,
  onSelectTrail,
  onHoverTrail,
  fitKey,
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

  return (
    <MapContainer
      center={defaultCenter}
      zoom={4}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer attribution={TOPO_TILE_ATTRIBUTION} url={TOPO_TILE_URL} maxZoom={17} />
      <FitMap waypoints={waypoints} fitKey={fitKey} showAllTrails={waypoints.length === 0} />
      <ClickToAdd enabled={addMode && !connectMode} onAdd={onAddWaypoint} />

      {sortedTrails.map((trail) => (
        <TrailLayer
          key={trail.id}
          trail={trail}
          connected={connectedTrailIds.includes(trail.id)}
          highlighted={highlightedTrailId === trail.id}
          connectMode={connectMode}
          onSelect={onSelectTrail}
          onHover={onHoverTrail}
        />
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

      {waypoints.map((w, i) => (
        <Marker
          key={w.id}
          position={[w.lat, w.lng]}
          icon={blazeIcon(i, i === 0 || i === waypoints.length - 1)}
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
      ))}
    </MapContainer>
  );
}
