'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { Photo } from '@/lib/posts';
import { TILE_URL, TILE_ATTRIBUTION, fixLeafletIcons } from '@/lib/leaflet-config';
import 'leaflet/dist/leaflet.css';

interface MiniMapProps {
  trailGeoJson?: FeatureCollection;
  photos: Photo[];
}

export default function MiniMap({ trailGeoJson, photos }: MiniMapProps) {
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

      {gpsPhotos.map((photo, i) => (
        <Marker key={`${photo.filename}-${i}`} position={[photo.lat, photo.lng]}>
          <Popup>{photo.caption ?? photo.filename}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
