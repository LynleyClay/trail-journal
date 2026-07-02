'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet';
import type { FeatureCollection } from 'geojson';
import { TILE_URL, TILE_ATTRIBUTION, fixLeafletIcons } from '@/lib/leaflet-config';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
  trailGeoJson?: FeatureCollection;
}

// Roughly the geographic center of the continental US — used only when a
// photo has no location yet, so the picker starts somewhere reasonable.
const DEFAULT_CENTER: [number, number] = [39.8, -98.6];
const DEFAULT_ZOOM = 4;
const PICKED_ZOOM = 12;
const TRAIL_LINE_STYLE = { color: '#059669', weight: 3, opacity: 0.8 };

function ClickToPlace({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Keeps the map in sync when coordinates change from outside the map itself
// (e.g. the numeric lat/lng inputs), without fighting the user's own pans/zooms.
function RecenterOnExternalChange({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      map.setView([lat, lng], Math.max(map.getZoom(), PICKED_ZOOM));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

// Zooms to the selected trail's extent so it's actually visible to click on,
// but only before a pin exists — once a photo has a location, stay centered there.
function FitTrailBounds({ trailGeoJson, hasPosition }: { trailGeoJson?: FeatureCollection; hasPosition: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!trailGeoJson || hasPosition) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet') as typeof import('leaflet');
    const bounds = L.geoJSON(trailGeoJson).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailGeoJson, hasPosition]);
  return null;
}

export default function LocationPicker({ lat, lng, onChange, trailGeoJson }: LocationPickerProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const hasPosition = typeof lat === 'number' && typeof lng === 'number';

  return (
    <div>
      <MapContainer
        center={hasPosition ? [lat, lng] : DEFAULT_CENTER}
        zoom={hasPosition ? PICKED_ZOOM : DEFAULT_ZOOM}
        style={{ height: '220px', width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {trailGeoJson && <GeoJSON data={trailGeoJson} style={TRAIL_LINE_STYLE} />}
        <ClickToPlace onChange={onChange} />
        <RecenterOnExternalChange lat={lat} lng={lng} />
        <FitTrailBounds trailGeoJson={trailGeoJson} hasPosition={hasPosition} />
        {hasPosition && (
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend: (e: { target: LeafletMarker }) => {
                const pos = e.target.getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}
      </MapContainer>
      <p className="mt-1 text-xs text-stone-400">
        Click the map (or the trail line) to drop a pin, or drag the pin to fine-tune it.
      </p>
    </div>
  );
}
