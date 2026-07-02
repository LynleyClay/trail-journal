'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent, Marker as LeafletMarker } from 'leaflet';
import { TILE_URL, TILE_ATTRIBUTION, fixLeafletIcons } from '@/lib/leaflet-config';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

// Roughly the geographic center of the continental US — used only when a
// photo has no location yet, so the picker starts somewhere reasonable.
const DEFAULT_CENTER: [number, number] = [39.8, -98.6];
const DEFAULT_ZOOM = 4;
const PICKED_ZOOM = 12;

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

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
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
        <ClickToPlace onChange={onChange} />
        <RecenterOnExternalChange lat={lat} lng={lng} />
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
        Click the map to drop a pin, or drag the pin to fine-tune it.
      </p>
    </div>
  );
}
