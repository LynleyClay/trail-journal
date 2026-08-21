import { describe, it, expect } from 'vitest';
import { parseGpx, simplifyRoute, GpxParseError } from '@/lib/gpx';

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Hike</name>
    <trkseg>
      <trkpt lat="34.1000" lon="-84.2000"><ele>500</ele></trkpt>
      <trkpt lat="34.1010" lon="-84.2010"><ele>510</ele></trkpt>
      <trkpt lat="34.1020" lon="-84.2020"><ele>520</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('parseGpx', () => {
  it('extracts lat/lng pairs from trkpt elements', () => {
    const points = parseGpx(SAMPLE_GPX);
    expect(points).toEqual([
      [34.1, -84.2],
      [34.101, -84.201],
      [34.102, -84.202],
    ]);
  });

  it('falls back to rtept elements when there are no trkpt', () => {
    const routeGpx = `<gpx><rte><rtept lat="1.0" lon="2.0" /><rtept lat="1.5" lon="2.5" /></rte></gpx>`;
    expect(parseGpx(routeGpx)).toEqual([
      [1.0, 2.0],
      [1.5, 2.5],
    ]);
  });

  it('throws GpxParseError for malformed XML', () => {
    expect(() => parseGpx('<gpx><trk><trkseg>')).toThrow(GpxParseError);
  });

  it('throws GpxParseError when no track points are present', () => {
    expect(() => parseGpx('<gpx><trk><trkseg></trkseg></trk></gpx>')).toThrow(GpxParseError);
  });

  it('skips points with invalid coordinates', () => {
    const gpx = `<gpx><trk><trkseg>
      <trkpt lat="34.1" lon="-84.2" />
      <trkpt lat="not-a-number" lon="-84.2" />
    </trkseg></trk></gpx>`;
    expect(parseGpx(gpx)).toEqual([[34.1, -84.2]]);
  });

  it('reads Strava GPX files that declare a default XML namespace', () => {
    const strava = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Morning Run</name>
    <trkseg>
      <trkpt lat="35.6118" lon="-83.4895"></trkpt>
      <trkpt lat="35.6120" lon="-83.4900"></trkpt>
    </trkseg>
  </trk>
</gpx>`;
    expect(parseGpx(strava)).toEqual([
      [35.6118, -83.4895],
      [35.612, -83.49],
    ]);
  });
});

describe('simplifyRoute', () => {
  it('returns short routes unchanged', () => {
    const points: [number, number][] = [[0, 0], [1, 1]];
    expect(simplifyRoute(points)).toEqual(points);
  });

  it('collapses a perfectly straight line down to its endpoints', () => {
    const points: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3]];
    expect(simplifyRoute(points)).toEqual([[0, 0], [3, 3]]);
  });

  it('keeps a point that deviates significantly from the line', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, -5], // big detour
      [3, 1],
      [4, 0],
    ];
    const simplified = simplifyRoute(points, 2);
    expect(simplified).toContainEqual([2, -5]);
    expect(simplified.length).toBeLessThan(points.length);
  });
});
