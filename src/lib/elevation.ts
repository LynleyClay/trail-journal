import { haversineMiles } from '@/lib/routes';

export const MAX_ELEVATION_POINTS = 120;
export const MIN_SAMPLE_MILES = 0.2;
export const GAIN_THRESHOLD_FT = 15;

export type LatLng = { lat: number; lng: number };

export type ElevationSample = {
  lat: number;
  lng: number;
  miles: number;
  elevationFt: number;
};

export type ElevationProfile = {
  samples: ElevationSample[];
  gainFt: number;
  lossFt: number;
  minFt: number;
  maxFt: number;
};

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function geometryKey(points: LatLng[]): string {
  if (points.length === 0) return 'empty';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const mid = points[Math.floor(points.length / 2)]!;
  return [
    points.length,
    first.lat.toFixed(4),
    first.lng.toFixed(4),
    mid.lat.toFixed(4),
    mid.lng.toFixed(4),
    last.lat.toFixed(4),
    last.lng.toFixed(4),
  ].join(':');
}

export function interpolatePoint(a: LatLng, b: LatLng, t: number): LatLng {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/** Walk the polyline and emit points at roughly even distance, capped for DEM lookups. */
export function sampleRouteForElevation(
  waypoints: LatLng[],
  maxPoints = MAX_ELEVATION_POINTS,
  minSampleMiles = MIN_SAMPLE_MILES,
): { lat: number; lng: number; miles: number }[] {
  if (waypoints.length === 0) return [];
  const start = waypoints[0]!;
  if (waypoints.length === 1) {
    return [{ lat: start.lat, lng: start.lng, miles: 0 }];
  }

  const dense: { lat: number; lng: number; miles: number }[] = [
    { lat: start.lat, lng: start.lng, miles: 0 },
  ];
  let miles = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const from = waypoints[i - 1]!;
    const to = waypoints[i]!;
    const seg = haversineMiles(from, to);
    if (seg < 0.0001) continue;
    const steps = Math.max(1, Math.ceil(seg / minSampleMiles));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const pt = interpolatePoint(from, to, t);
      miles += seg / steps;
      dense.push({ lat: pt.lat, lng: pt.lng, miles });
    }
  }

  if (dense.length <= maxPoints) return dense;

  const sampled: typeof dense = [];
  const lastIndex = dense.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = i === maxPoints - 1 ? lastIndex : Math.round((i * lastIndex) / (maxPoints - 1));
    const point = dense[idx];
    if (point) sampled.push(point);
  }
  return sampled.filter((point, i, arr) => i === 0 || point.miles > (arr[i - 1]?.miles ?? -1));
}

export function fillElevationGaps(values: Array<number | null | undefined>): number[] {
  const filled = values.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
  let last = filled.find((value) => value != null) ?? 0;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i] == null) filled[i] = last;
    else last = filled[i]!;
  }
  return filled as number[];
}

export function smoothElevations(values: number[], window = 3): number[] {
  if (values.length === 0 || window <= 1) return [...values];
  const radius = Math.floor(window / 2);
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - radius; j <= i + radius; j++) {
      const value = values[j];
      if (value == null) continue;
      sum += value;
      count++;
    }
    return count > 0 ? sum / count : (values[i] ?? 0);
  });
}

export function elevationGainLoss(
  elevationsFt: number[],
  minStepFt = GAIN_THRESHOLD_FT,
): { gainFt: number; lossFt: number } {
  let gainFt = 0;
  let lossFt = 0;
  for (let i = 1; i < elevationsFt.length; i++) {
    const delta = (elevationsFt[i] ?? 0) - (elevationsFt[i - 1] ?? 0);
    if (delta >= minStepFt) gainFt += delta;
    else if (delta <= -minStepFt) lossFt += -delta;
  }
  return { gainFt, lossFt };
}

export function buildElevationProfile(
  points: { lat: number; lng: number; miles: number }[],
  elevationsMeters: Array<number | null | undefined>,
): ElevationProfile {
  const meters = fillElevationGaps(elevationsMeters);
  const smoothed = smoothElevations(meters.map(metersToFeet));
  const samples: ElevationSample[] = points.map((point, i) => ({
    lat: point.lat,
    lng: point.lng,
    miles: point.miles,
    elevationFt: smoothed[i] ?? 0,
  }));
  const elevations = samples.map((sample) => sample.elevationFt);
  const { gainFt, lossFt } = elevationGainLoss(elevations);
  return {
    samples,
    gainFt,
    lossFt,
    minFt: elevations.length ? Math.min(...elevations) : 0,
    maxFt: elevations.length ? Math.max(...elevations) : 0,
  };
}

function closestTOnSegment(p: LatLng, a: LatLng, b: LatLng): { t: number; dist: number } {
  const seg = haversineMiles(a, b);
  if (seg < 0.001) return { t: 0, dist: haversineMiles(p, a) };

  const steps = Math.max(8, Math.ceil(seg / 0.15));
  let bestT = 0;
  let bestDist = haversineMiles(p, a);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const dist = haversineMiles(p, interpolatePoint(a, b, t));
    if (dist < bestDist) {
      bestDist = dist;
      bestT = t;
    }
  }
  return { t: bestT, dist: bestDist };
}

export function progressAlongRoute(
  waypoints: LatLng[],
  point: LatLng,
): { miles: number; offRouteMiles: number } {
  if (waypoints.length === 0) return { miles: 0, offRouteMiles: Infinity };
  if (waypoints.length === 1) {
    return { miles: 0, offRouteMiles: haversineMiles(point, waypoints[0]!) };
  }

  let bestMiles = 0;
  let bestDist = Infinity;
  let walked = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!;
    const b = waypoints[i]!;
    const seg = haversineMiles(a, b);
    const { t, dist } = closestTOnSegment(point, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      bestMiles = walked + seg * t;
    }
    walked += seg;
  }

  return { miles: bestMiles, offRouteMiles: bestDist };
}

export function elevationAtMiles(profile: ElevationProfile, miles: number): ElevationSample {
  const samples = profile.samples;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first) {
    return { lat: 0, lng: 0, miles: 0, elevationFt: 0 };
  }
  if (!last || miles <= first.miles) return first;
  if (miles >= last.miles) return last;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]!;
    const next = samples[i]!;
    if (miles > next.miles) continue;
    const span = next.miles - prev.miles;
    const t = span > 0.0001 ? (miles - prev.miles) / span : 0;
    return {
      lat: prev.lat + (next.lat - prev.lat) * t,
      lng: prev.lng + (next.lng - prev.lng) * t,
      miles,
      elevationFt: prev.elevationFt + (next.elevationFt - prev.elevationFt) * t,
    };
  }
  return last;
}

export function remainingClimbFt(profile: ElevationProfile, fromMiles: number): number {
  const here = elevationAtMiles(profile, fromMiles);
  const ahead = profile.samples
    .filter((sample) => sample.miles >= fromMiles)
    .map((sample) => sample.elevationFt);
  return elevationGainLoss([here.elevationFt, ...ahead]).gainFt;
}

export function formatFeet(ft: number): string {
  const rounded = Math.round(ft);
  return `${rounded.toLocaleString('en-US')} ft`;
}

export type ProfileLayout = {
  width: number;
  height: number;
  pad: { top: number; right: number; bottom: number; left: number };
  innerWidth: number;
  innerHeight: number;
  yMin: number;
  yMax: number;
  totalMiles: number;
};

export function profileLayout(
  profile: ElevationProfile,
  width: number,
  height: number,
): ProfileLayout {
  const pad = { top: 18, right: 16, bottom: 28, left: 44 };
  const range = Math.max(400, profile.maxFt - profile.minFt);
  const paddingFt = range * 0.12;
  return {
    width,
    height,
    pad,
    innerWidth: Math.max(1, width - pad.left - pad.right),
    innerHeight: Math.max(1, height - pad.top - pad.bottom),
    yMin: profile.minFt - paddingFt,
    yMax: profile.maxFt + paddingFt,
    totalMiles: profile.samples[profile.samples.length - 1]?.miles ?? 0,
  };
}

export function xOfMiles(layout: ProfileLayout, miles: number): number {
  if (layout.totalMiles <= 0) return layout.pad.left;
  const t = Math.min(1, Math.max(0, miles / layout.totalMiles));
  return layout.pad.left + t * layout.innerWidth;
}

export function yOfFt(layout: ProfileLayout, ft: number): number {
  const span = layout.yMax - layout.yMin || 1;
  const t = (ft - layout.yMin) / span;
  return layout.pad.top + (1 - t) * layout.innerHeight;
}

export function milesOfX(layout: ProfileLayout, x: number): number {
  const t = (x - layout.pad.left) / layout.innerWidth;
  return Math.min(layout.totalMiles, Math.max(0, t * layout.totalMiles));
}

export function areaPath(profile: ElevationProfile, layout: ProfileLayout): string {
  if (profile.samples.length === 0) return '';
  const baseY = layout.pad.top + layout.innerHeight;
  const first = profile.samples[0]!;
  const last = profile.samples[profile.samples.length - 1]!;
  const line = profile.samples
    .map((sample, i) => {
      const x = xOfMiles(layout, sample.miles);
      const y = yOfFt(layout, sample.elevationFt);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return `${line} L${xOfMiles(layout, last.miles).toFixed(1)} ${baseY} L${xOfMiles(layout, first.miles).toFixed(1)} ${baseY} Z`;
}

export function linePath(profile: ElevationProfile, layout: ProfileLayout): string {
  return profile.samples
    .map((sample, i) => {
      const x = xOfMiles(layout, sample.miles);
      const y = yOfFt(layout, sample.elevationFt);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function gradeSegments(
  profile: ElevationProfile,
  layout: ProfileLayout,
): { d: string; grade: number }[] {
  const segments: { d: string; grade: number }[] = [];
  for (let i = 1; i < profile.samples.length; i++) {
    const prev = profile.samples[i - 1]!;
    const next = profile.samples[i]!;
    const runFt = Math.max(1, (next.miles - prev.miles) * 5280);
    const grade = ((next.elevationFt - prev.elevationFt) / runFt) * 100;
    segments.push({
      d: `M${xOfMiles(layout, prev.miles).toFixed(1)} ${yOfFt(layout, prev.elevationFt).toFixed(1)} L${xOfMiles(layout, next.miles).toFixed(1)} ${yOfFt(layout, next.elevationFt).toFixed(1)}`,
      grade,
    });
  }
  return segments;
}

export function gradeColor(grade: number): string {
  if (grade >= 15) return '#c2410c';
  if (grade >= 10) return '#ea580c';
  if (grade >= 5) return '#d97706';
  if (grade <= -15) return '#1d4ed8';
  if (grade <= -10) return '#2563eb';
  return '#059669';
}
