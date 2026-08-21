import { describe, it, expect } from 'vitest';
import {
  appendTrailPin,
  getTrailById,
  nearestTrailSnap,
  snapToTrail,
  trailSegment,
  uniqueTrailIds,
  type LongTrail,
} from '@/lib/long-trails';
import type { Waypoint } from '@/lib/routes';

const stub: LongTrail = {
  id: 'stub',
  name: 'Stub Trail',
  abbrev: 'ST',
  region: 'East',
  miles: 30,
  color: '#000',
  termini: ['South', 'North'],
  path: [
    { lat: 40, lng: -80 },
    { lat: 41, lng: -80 },
    { lat: 42, lng: -80 },
  ],
};

describe('snapToTrail', () => {
  it('projects a nearby click onto the corridor', () => {
    const snap = snapToTrail(stub, { lat: 41, lng: -80.2 });
    expect(snap.lat).toBeCloseTo(41, 5);
    expect(snap.lng).toBeCloseTo(-80, 5);
    expect(snap.progress).toBeCloseTo(1, 5);
  });
});

describe('trailSegment', () => {
  it('returns only the stretch between two pins', () => {
    const pts = trailSegment(stub, { lat: 40.2, lng: -80 }, { lat: 41.8, lng: -80 });
    expect(pts[0]?.lat).toBeCloseTo(40.2, 5);
    expect(pts.some((p) => p.lat === 41)).toBe(true);
    expect(pts[pts.length - 1]?.lat).toBeCloseTo(41.8, 5);
    expect(pts.every((p) => p.lat >= 40.19 && p.lat <= 41.81)).toBe(true);
  });

  it('follows the corridor in reverse', () => {
    const pts = trailSegment(stub, { lat: 42, lng: -80 }, { lat: 40, lng: -80 });
    expect(pts[0]?.lat).toBeCloseTo(42, 5);
    expect(pts[pts.length - 1]?.lat).toBeCloseTo(40, 5);
  });
});

describe('appendTrailPin', () => {
  it('drops a snapped pin, then fills the trail between two pins', () => {
    const first = appendTrailPin([], stub, { lat: 40, lng: -80 });
    expect(first.kind).toBe('pin');
    expect(first.added).toBe(1);
    expect(first.waypoints[0]?.trailId).toBe('stub');

    const second = appendTrailPin(first.waypoints, stub, { lat: 42, lng: -80 });
    expect(second.kind).toBe('segment');
    expect(second.waypoints.length).toBeGreaterThan(first.waypoints.length);
    expect(second.waypoints[second.waypoints.length - 1]?.lat).toBeCloseTo(42, 5);
    expect(uniqueTrailIds(second.waypoints)).toEqual(['stub']);
  });

  it('does not swallow an off-trail pin when starting a new trail', () => {
    const offTrail: Waypoint[] = [
      { id: 'town', name: 'Town', lat: 39.5, lng: -79.5 },
    ];
    const next = appendTrailPin(offTrail, stub, { lat: 40, lng: -80 });
    expect(next.kind).toBe('pin');
    expect(next.waypoints).toHaveLength(2);
    expect(next.waypoints[0]?.name).toBe('Town');
    expect(next.waypoints[1]?.trailId).toBe('stub');
  });
});

describe('uniqueTrailIds', () => {
  it('keeps trail order without repeating consecutive ids', () => {
    const at = getTrailById('at');
    expect(at).toBeTruthy();
    const ids = uniqueTrailIds([
      { id: 'a', name: 'A', lat: 1, lng: 1, trailId: 'at' },
      { id: 'b', name: 'B', lat: 2, lng: 2, trailId: 'at' },
      { id: 'c', name: 'C', lat: 3, lng: 3 },
      { id: 'd', name: 'D', lat: 4, lng: 4, trailId: 'pct' },
    ]);
    expect(ids).toEqual(['at', 'pct']);
  });
});

describe('nearestTrailSnap', () => {
  it('snaps a nearby click and ignores a far click', () => {
    const at = getTrailById('at');
    expect(at).toBeTruthy();
    const onTrail = at!.path[4];
    expect(onTrail).toBeTruthy();
    expect(nearestTrailSnap(onTrail!, 0.5)?.trailId).toBe('at');
    expect(nearestTrailSnap({ lat: 0, lng: 0 }, 0.5)).toBeNull();
  });
});
