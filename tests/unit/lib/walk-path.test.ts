import { describe, it, expect } from 'vitest';
import {
  appendRoutedPin,
  isReasonableWalk,
  shouldTryWalkPath,
  simplifyPath,
} from '@/lib/walk-path';
import type { Waypoint } from '@/lib/routes';

describe('shouldTryWalkPath', () => {
  it('skips tiny gaps and huge gaps', () => {
    expect(shouldTryWalkPath({ lat: 40, lng: -80 }, { lat: 40.0001, lng: -80 })).toBe(false);
    expect(shouldTryWalkPath({ lat: 40, lng: -80 }, { lat: 40.2, lng: -80 })).toBe(true);
    expect(shouldTryWalkPath({ lat: 40, lng: -80 }, { lat: 48, lng: -80 })).toBe(false);
  });
});

describe('isReasonableWalk', () => {
  it('rejects routes that detour far beyond the straight line', () => {
    expect(isReasonableWalk(2, 2 * 1609.34)).toBe(true);
    expect(isReasonableWalk(2, 20 * 1609.34)).toBe(false);
  });
});

describe('simplifyPath', () => {
  it('keeps endpoints and thins middle points', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ lat: 40 + i * 0.2, lng: -80 }));
    const simplified = simplifyPath(pts, 1, 8);
    expect(simplified[0]).toEqual(pts[0]);
    expect(simplified[simplified.length - 1]).toEqual(pts[pts.length - 1]);
    expect(simplified.length).toBeLessThanOrEqual(8);
  });
});

describe('appendRoutedPin', () => {
  it('inserts shape points between stops and keeps the destination', () => {
    const start: Waypoint[] = [{ id: 'a', name: 'Start', lat: 40, lng: -80 }];
    const dest: Waypoint = { id: 'b', name: 'End', lat: 40.5, lng: -80 };
    const path = [
      { lat: 40, lng: -80 },
      { lat: 40.2, lng: -80 },
      { lat: 40.4, lng: -80 },
      { lat: 40.5, lng: -80 },
    ];
    const result = appendRoutedPin(start, dest, path);
    expect(result.usedPath).toBe(true);
    expect(result.waypoints[result.waypoints.length - 1]?.id).toBe('b');
    expect(result.waypoints.some((w) => w.kind === 'shape')).toBe(true);
  });

  it('falls back to a single destination pin when no path is found', () => {
    const start: Waypoint[] = [{ id: 'a', name: 'Start', lat: 40, lng: -80 }];
    const dest: Waypoint = { id: 'b', name: 'End', lat: 40.5, lng: -80 };
    const result = appendRoutedPin(start, dest, []);
    expect(result.usedPath).toBe(false);
    expect(result.waypoints).toHaveLength(2);
  });
});
