'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from 'react-leaflet';
import type { ActiveRoute } from '@/lib/active-routes';
import { TOPO_TILE_ATTRIBUTION, TOPO_TILE_URL, fixLeafletIcons } from '@/lib/leaflet-config';
import {
  filterPoisNearRoute,
  formatTownType,
  formatWaterType,
  distanceToRouteMiles,
} from '@/lib/route-proximity';
import type { GpsPosition } from './useLiveGps';
import 'leaflet/dist/leaflet.css';

const TOWN_MAX_MI = 8;
const WATER_MAX_MI = 0.5;

function FitRoute({
  route,
  gps,
  towns,
  water,
}: {
  route: ActiveRoute;
  gps: GpsPosition | null;
  towns: { lat: number; lng: number }[];
  water: { lat: number; lng: number }[];
}) {
  const map = useMap();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    const bounds = L.latLngBounds(
      route.waypoints.map((w) => [w.lat, w.lng] as [number, number]),
    );
    for (const poi of [...towns, ...water]) {
      bounds.extend([poi.lat, poi.lng]);
    }
    if (gps) bounds.extend([gps.lat, gps.lng]);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
    }
  }, [map, route, gps, towns, water]);
  return null;
}

function gpsIcon() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'gps-marker',
    html: '<span class="gps-marker__dot"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function townIcon() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'poi-marker',
    html: `<span class="poi-marker__badge poi-marker__badge--town" title="Town">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6zm0 2.2 5 3.75V19h-2v-6H9v6H7v-10.05L12 5.2z"/>
      </svg>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32],
  });
}

function waterIcon() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  return L.divIcon({
    className: 'poi-marker',
    html: `<span class="poi-marker__badge poi-marker__badge--water" title="Water">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path fill="currentColor" d="M12 2.5c-2.2 3.5-6 8.1-6 12a6 6 0 1 0 12 0c0-3.9-3.8-8.5-6-12zm0 17.5a3.5 3.5 0 0 1-3.5-3.5c0-2.2 2.2-5.6 3.5-7.4 1.3 1.8 3.5 5.2 3.5 7.4A3.5 3.5 0 0 1 12 20z"/>
      </svg>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
    popupAnchor: [0, -32],
  });
}

type ActiveRouteMapProps = {
  route: ActiveRoute;
  gps: GpsPosition | null;
  defaultCenter: [number, number];
  trackGps: boolean;
  useOfflineTiles?: boolean;
};

export function ActiveRouteMap({
  route,
  gps,
  defaultCenter,
  trackGps,
  useOfflineTiles = false,
}: ActiveRouteMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const positions = useMemo(
    () => route.waypoints.map((w) => [w.lat, w.lng] as [number, number]),
    [route.waypoints],
  );

  const towns = useMemo(
    () => filterPoisNearRoute(route.resupply, route.waypoints, TOWN_MAX_MI),
    [route.resupply, route.waypoints],
  );

  const water = useMemo(
    () => filterPoisNearRoute(route.water, route.waypoints, WATER_MAX_MI),
    [route.water, route.waypoints],
  );

  return (
    <MapContainer center={defaultCenter} zoom={6} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution={TOPO_TILE_ATTRIBUTION}
        url={TOPO_TILE_URL}
        maxZoom={17}
        crossOrigin="anonymous"
        {...(useOfflineTiles ? { updateWhenIdle: true, keepBuffer: 4 } : {})}
      />
      <FitRoute route={route} gps={gps} towns={towns} water={water} />

      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: '#E85D04', weight: 4, opacity: 0.95, lineCap: 'round' }}
        />
      )}

      {route.waypoints.map((w, i) => (
        <CircleMarker
          key={w.id}
          center={[w.lat, w.lng]}
          radius={i === 0 || i === route.waypoints.length - 1 ? 7 : 5}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: '#E85D04',
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <strong>{w.name}</strong>
            {w.note ? <p className="text-sm mt-1">{w.note}</p> : null}
          </Popup>
        </CircleMarker>
      ))}

      {towns.map((poi) => {
        const dist = distanceToRouteMiles(poi, route.waypoints);
        return (
          <Marker
            key={poi.id}
            position={[poi.lat, poi.lng]}
            icon={townIcon()}
            zIndexOffset={1200}
          >
            <Popup>
              <div className="min-w-[140px]">
                <strong>{poi.name}</strong>
                <p className="text-sm text-stone-600 mt-1">{formatTownType(poi.detail)}</p>
                <p className="text-xs text-stone-500 mt-1">
                  ~{dist.toFixed(1)} mi from trail · resupply
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {water.map((poi) => {
        const dist = distanceToRouteMiles(poi, route.waypoints);
        return (
          <Marker
            key={poi.id}
            position={[poi.lat, poi.lng]}
            icon={waterIcon()}
            zIndexOffset={1100}
          >
            <Popup>
              <div className="min-w-[140px]">
                <strong>{poi.name || formatWaterType(poi.detail)}</strong>
                <p className="text-sm text-stone-600 mt-1">{formatWaterType(poi.detail)}</p>
                <p className="text-xs text-stone-500 mt-1">
                  ~{dist.toFixed(1)} mi from trail
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {trackGps && gps && (
        <>
          <Circle
            center={[gps.lat, gps.lng]}
            radius={gps.accuracy}
            pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.12, weight: 1 }}
          />
          <Marker position={[gps.lat, gps.lng]} icon={gpsIcon()}>
            <Popup>You are here</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}
