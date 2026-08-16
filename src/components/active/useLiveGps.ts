'use client';

import { useEffect, useState } from 'react';

export type GpsPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export function useLiveGps(enabled: boolean) {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      setWatching(false);
      return;
    }

    setError(null);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setWatching(true);
      },
      (err) => {
        setError(err.message);
        setWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      navigator.geolocation.clearWatch(id);
      setWatching(false);
    };
  }, [enabled]);

  return { position, error, watching };
}
