import { describe, it, expect } from 'vitest';
import {
  holdMovedTooFar,
  isDoubleTap,
  type PlacePoint,
} from '@/lib/map-place-gestures';

function tap(partial: Partial<PlacePoint> & Pick<PlacePoint, 'time'>): PlacePoint {
  return { lat: 35, lng: -83, x: 100, y: 100, ...partial };
}

describe('map place gestures', () => {
  it('treats two quick taps in the same spot as a double tap', () => {
    const first = tap({ time: 1000 });
    const second = tap({ time: 1280, x: 108, y: 104 });
    expect(isDoubleTap(first, second)).toBe(true);
  });

  it('ignores a slow second tap or a tap that moved away', () => {
    const first = tap({ time: 1000 });
    expect(isDoubleTap(first, tap({ time: 1600 }))).toBe(false);
    expect(isDoubleTap(first, tap({ time: 1200, x: 160, y: 100 }))).toBe(false);
    expect(isDoubleTap(null, tap({ time: 1000 }))).toBe(false);
  });

  it('cancels a hold once the pointer has clearly started panning', () => {
    expect(holdMovedTooFar({ x: 50, y: 50 }, { x: 55, y: 52 })).toBe(false);
    expect(holdMovedTooFar({ x: 50, y: 50 }, { x: 80, y: 50 })).toBe(true);
  });
});
