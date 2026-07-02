'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { Post } from '@/lib/posts';
import { photoUrl } from '@/lib/photo-url';
import { TILE_URL, TILE_ATTRIBUTION, fixLeafletIcons } from '@/lib/leaflet-config';
import { Lightbox } from './Lightbox';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  posts: Post[];
  trailGeoJsons: Record<string, FeatureCollection>;
  defaultCenter: [number, number];
  defaultZoom: number;
}

interface LightboxState {
  src: string;
  alt: string;
}

// Fits the initial view to all trail lines so every trail is visible on
// load regardless of screen size, rather than relying on a fixed zoom
// that only happens to work at one viewport width.
function FitAllTrails({ trailGeoJsons }: { trailGeoJsons: Record<string, FeatureCollection> }) {
  const map = useMap();
  useEffect(() => {
    const geoJsons = Object.values(trailGeoJsons);
    if (geoJsons.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    const bounds = L.latLngBounds([]);
    for (const geoJson of geoJsons) {
      bounds.extend(L.geoJSON(geoJson).getBounds());
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function MapView({ posts, trailGeoJsons, defaultCenter, defaultZoom }: MapViewProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const TRAIL_COLORS: Record<string, string> = {
    PCT: '#10b981',
    CDT: '#f59e0b',
    AT: '#3b82f6',
  };

  return (
    <>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitAllTrails trailGeoJsons={trailGeoJsons} />

        {Object.entries(trailGeoJsons).map(([name, geoJson]) => (
          <GeoJSON
            key={name}
            data={geoJson}
            style={{ color: TRAIL_COLORS[name] ?? '#64748b', weight: 2, opacity: 0.7 }}
          />
        ))}

        {posts.map((post) => (
          <Marker
            key={post.slug}
            position={
              post.photos.find((p) => p.lat && p.lng) != null
                ? [post.photos.find((p) => p.lat && p.lng)!.lat!, post.photos.find((p) => p.lat && p.lng)!.lng!]
                : defaultCenter
            }
          >
            <Popup>
              <div className="flex flex-col gap-1 min-w-[160px]">
                {post.trail && (
                  <span className="text-xs font-semibold uppercase text-emerald-700">
                    {post.trail}
                  </span>
                )}
                <strong className="text-sm">{post.title}</strong>
                <span className="text-xs text-stone-500">{post.date}</span>
                {post.coverPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl(post.slug, post.coverPhoto)}
                    alt={post.title}
                    className="w-full rounded"
                    style={{ maxHeight: 80, objectFit: 'cover' }}
                  />
                )}
                <a
                  href={`/posts/${post.slug}`}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Read more →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {posts.flatMap((post) =>
          post.photos
            .filter((p): p is typeof p & { lat: number; lng: number } =>
              typeof p.lat === 'number' && typeof p.lng === 'number'
            )
            .map((photo, i) => (
              <Marker
                key={`${post.slug}-photo-${i}`}
                position={[photo.lat, photo.lng]}
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                icon={(() => {
                  const L = require('leaflet') as typeof import('leaflet');
                  return new L.Icon({
                    iconUrl: '/leaflet/marker-icon.png',
                    iconSize: [16, 24],
                    iconAnchor: [8, 24],
                  });
                })()}
                eventHandlers={{
                  click: () =>
                    setLightbox({
                      src: photoUrl(post.slug, photo.filename),
                      alt: photo.caption ?? photo.filename,
                    }),
                }}
              >
                <Popup>{photo.caption ?? photo.filename}</Popup>
              </Marker>
            ))
        )}
      </MapContainer>

      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          isOpen={true}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
