import {
  geometryKey,
  type ElevationProfile,
  type LatLng,
} from '@/lib/elevation';

const STORAGE_KEY = 'trail-journal-elevation-v1';

type CacheFile = Record<string, { key: string; profile: ElevationProfile; savedAt: string }>;

function readFile(): CacheFile {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheFile;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFile(file: CacheFile): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
}

export function getCachedElevation(routeId: string, waypoints: LatLng[]): ElevationProfile | null {
  const record = readFile()[routeId];
  if (!record) return null;
  if (record.key !== geometryKey(waypoints)) return null;
  return record.profile;
}

export function saveCachedElevation(
  routeId: string,
  waypoints: LatLng[],
  profile: ElevationProfile,
): void {
  const file = readFile();
  file[routeId] = {
    key: geometryKey(waypoints),
    profile,
    savedAt: new Date().toISOString(),
  };
  try {
    writeFile(file);
  } catch {
    // Quota errors should not break the live climb view.
  }
}
