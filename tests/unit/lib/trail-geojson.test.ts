import { describe, it, expect } from 'vitest';
import { loadTrailGeoJsons, loadTrailGeoJsonsForUser } from '@/lib/trail-geojson';

describe('loadTrailGeoJsons', () => {
  it('includes AT, PCT, and CDT overlays for the public map', () => {
    const trails = loadTrailGeoJsons();
    expect(Object.keys(trails).sort()).toEqual(['AT', 'CDT', 'PCT']);
    for (const name of ['AT', 'PCT', 'CDT'] as const) {
      expect(trails[name]?.features.length).toBeGreaterThan(0);
    }
  });
});

describe('loadTrailGeoJsonsForUser', () => {
  it('returns only the trails the hiker has completed', () => {
    const trails = loadTrailGeoJsonsForUser(['at']);
    expect(Object.keys(trails)).toEqual(['AT']);
  });

  it('returns nothing when the hiker has no completed long trails', () => {
    expect(loadTrailGeoJsonsForUser([])).toEqual({});
  });

  it('can overlay any catalog trail, not only AT, PCT, and CDT', () => {
    const trails = loadTrailGeoJsonsForUser(['nct']);
    expect(Object.keys(trails)).toEqual(['NCT']);
    expect(trails.NCT?.features.length).toBeGreaterThan(0);
  });
});
