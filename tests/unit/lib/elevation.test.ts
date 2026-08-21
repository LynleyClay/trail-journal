import { describe, it, expect } from 'vitest';
import {
  buildElevationProfile,
  elevationAtMiles,
  elevationGainLoss,
  formatFeet,
  geometryKey,
  gradeColor,
  metersToFeet,
  progressAlongRoute,
  remainingClimbFt,
  sampleRouteForElevation,
} from '@/lib/elevation';

describe('elevation helpers', () => {
  it('converts meters to feet', () => {
    expect(metersToFeet(1000)).toBeCloseTo(3280.84, 1);
  });

  it('samples long segments so the profile is not just the pins', () => {
    const samples = sampleRouteForElevation(
      [
        { lat: 35.0, lng: -83.0 },
        { lat: 35.3, lng: -83.0 },
      ],
      40,
      0.5,
    );
    expect(samples[0]?.miles).toBe(0);
    expect(samples.length).toBeGreaterThan(5);
    expect(samples[samples.length - 1]?.miles).toBeGreaterThan(15);
  });

  it('caps the number of DEM sample points', () => {
    const waypoints = Array.from({ length: 400 }, (_, i) => ({ lat: 35 + i * 0.01, lng: -83 }));
    const samples = sampleRouteForElevation(waypoints, 50, 0.2);
    expect(samples.length).toBeLessThanOrEqual(50);
    expect(samples[0]).toEqual(expect.objectContaining({ lat: 35 }));
  });

  it('ignores DEM jitter when totaling climb', () => {
    expect(elevationGainLoss([1000, 1008, 1003, 1400, 1388, 1800]).gainFt).toBeCloseTo(800, 0);
  });

  it('builds a profile from sampled points and meter readings', () => {
    const profile = buildElevationProfile(
      [
        { lat: 35, lng: -83, miles: 0 },
        { lat: 35.1, lng: -83, miles: 8 },
        { lat: 35.2, lng: -83, miles: 16 },
      ],
      [300, 900, 600],
    );
    expect(profile.samples).toHaveLength(3);
    expect(profile.maxFt).toBeGreaterThan(profile.minFt);
    expect(profile.gainFt).toBeGreaterThan(1000);
  });

  it('places a GPS point along the route by nearest stretch', () => {
    const waypoints = [
      { lat: 35.0, lng: -83 },
      { lat: 35.2, lng: -83 },
    ];
    const mid = { lat: 35.1, lng: -83 };
    const progress = progressAlongRoute(waypoints, mid);
    expect(progress.offRouteMiles).toBeLessThan(0.2);
    expect(progress.miles).toBeGreaterThan(6);
    expect(progress.miles).toBeLessThan(9);
  });

  it('reads elevation and remaining climb at a mile marker', () => {
    const profile = buildElevationProfile(
      [
        { lat: 35, lng: -83, miles: 0 },
        { lat: 35.05, lng: -83, miles: 5 },
        { lat: 35.1, lng: -83, miles: 10 },
      ],
      [300, 300, 900],
    );
    const mid = elevationAtMiles(profile, 5);
    expect(mid.elevationFt).toBeCloseTo(metersToFeet(300), 0);
    expect(remainingClimbFt(profile, 5)).toBeGreaterThan(1500);
    expect(remainingClimbFt(profile, 0)).toBeGreaterThan(remainingClimbFt(profile, 5));
  });

  it('colors steep grades hotter than easy trail', () => {
    expect(gradeColor(16)).toBe('#c2410c');
    expect(gradeColor(2)).toBe('#059669');
    expect(formatFeet(4210)).toBe('4,210 ft');
  });

  it('fingerprints route geometry so a changed line refetches', () => {
    const a = [
      { lat: 35, lng: -83 },
      { lat: 36, lng: -83 },
    ];
    const b = [
      { lat: 35, lng: -83 },
      { lat: 37, lng: -83 },
    ];
    expect(geometryKey(a)).not.toBe(geometryKey(b));
    expect(geometryKey(a)).toBe(geometryKey(a));
  });
});
