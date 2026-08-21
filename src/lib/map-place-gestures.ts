export const DOUBLE_TAP_MS = 400;
export const DOUBLE_TAP_MAX_PX = 28;
export const HOLD_MS = 500;
export const HOLD_MOVE_PX = 14;

export type PlacePoint = {
  lat: number;
  lng: number;
  x: number;
  y: number;
  time: number;
};

export function distancePx(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function isDoubleTap(prev: PlacePoint | null, next: PlacePoint): boolean {
  if (!prev) return false;
  if (next.time - prev.time > DOUBLE_TAP_MS) return false;
  return distancePx(prev, next) <= DOUBLE_TAP_MAX_PX;
}

export function holdMovedTooFar(start: { x: number; y: number }, now: { x: number; y: number }): boolean {
  return distancePx(start, now) > HOLD_MOVE_PX;
}

/** Skip pin gestures when the pointer is on a marker, popup, or zoom control. */
export function isMapChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('.leaflet-marker-icon') ||
      target.closest('.leaflet-marker-shadow') ||
      target.closest('.leaflet-control') ||
      target.closest('.leaflet-popup'),
  );
}
