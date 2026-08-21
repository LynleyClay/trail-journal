import type { LatLng } from '@/lib/elevation';

const BATCH_SIZE = 80;
const OPEN_METEO = 'https://api.open-meteo.com/v1/elevation';

type ElevationApiResponse = {
  elevation?: Array<number | null>;
};

export async function fetchElevationsMeters(points: LatLng[]): Promise<Array<number | null>> {
  const elevations: Array<number | null> = [];
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    const latitude = batch.map((point) => point.lat.toFixed(5)).join(',');
    const longitude = batch.map((point) => point.lng.toFixed(5)).join(',');
    const url = `${OPEN_METEO}?latitude=${latitude}&longitude=${longitude}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Elevation lookup failed (${res.status})`);
    }
    const data = (await res.json()) as ElevationApiResponse;
    if (!Array.isArray(data.elevation) || data.elevation.length !== batch.length) {
      throw new Error('Elevation lookup returned an unexpected response');
    }
    elevations.push(...data.elevation);
  }
  return elevations;
}
