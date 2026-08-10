'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { Photo } from '@/lib/posts';
import { TILE_URL, TILE_ATTRIBUTION, fixLeafletIcons } from '@/lib/leaflet-config';
import 'leaflet/dist/leaflet.css';

interface MiniMapProps {
  trailGeoJson?: FeatureCollection;
  photos: Photo[];
  route?: [number, number][];
}

// Fits the view to the hike's own GPS track and photo pins, since those are
// more specific to this post than the (much longer) reference trail line.
function FitToRoute({ route, gpsPhotos }: { route?: [number, number][]; gpsPhotos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const points = [...(route ?? []), ...gpsPhotos];
    if (points.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function MiniMap({ trailGeoJson, photos, route }: MiniMapProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const gpsPhotos = photos.filter(
    (p): p is Photo & { lat: number; lng: number } =>
      typeof p.lat === 'number' && typeof p.lng === 'number'
  );

  // Default center: first GPS photo, or fallback
  const center: [number, number] =
    gpsPhotos[0] != null ? [gpsPhotos[0].lat, gpsPhotos[0].lng] : [47.5, -120.5];

  return (
    <MapContainer
      center={center}
      zoom={10}
      style={{ height: '300px', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      {trailGeoJson && (
        <GeoJSON
          data={trailGeoJson}
          style={{ color: '#10b981', weight: 2, opacity: 0.7 }}
        />
      )}

      {route && route.length > 1 && (
        <Polyline positions={route} pathOptions={{ color: '#dc2626', weight: 3, opacity: 0.9 }} />
      )}

      {(route?.length || gpsPhotos.length > 0) && (
        <FitToRoute route={route} gpsPhotos={gpsPhotos.map((p) => [p.lat, p.lng])} />
      )}

      {gpsPhotos.map((photo, i) => (
        <Marker key={`${photo.filename}-${i}`} position={[photo.lat, photo.lng]}>
          <Popup>{photo.caption ?? photo.filename}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
