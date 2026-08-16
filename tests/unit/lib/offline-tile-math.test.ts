import { describe, it, expect } from 'vitest';
import {
  boundsFromPoints,
  enumerateTiles,
  latToTileY,
  lngToTileX,
  tileUrl,
} from '@/lib/offline/tile-math';

describe('offline tile-math', () => {
  it('computes tile coordinates for a known point', () => {
    expect(lngToTileX(-105, 10)).toBe(213);
    expect(latToTileY(39.5, 10)).toBe(389);
  });

  it('builds opentopomap tile URLs', () => {
    expect(tileUrl(10, 217, 386)).toMatch(/^https:\/\/[abc]\.tile\.opentopomap\.org\/10\/217\/386\.png$/);
  });

  it('enumerates tiles inside bounds', () => {
    const bounds = boundsFromPoints([
      { lat: 39.5, lng: -105.8 },
      { lat: 39.6, lng: -105.7 },
    ]);
    const tiles = enumerateTiles(bounds, 10, 10);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.length).toBeLessThan(20);
  });
});
