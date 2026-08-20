'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Keeps Leaflet sized correctly when the surrounding chrome collapses or the viewport changes. */
export function InvalidateMapOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    map.invalidateSize();
    return () => observer.disconnect();
  }, [map]);

  return null;
}
