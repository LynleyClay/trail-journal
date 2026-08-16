import type { ActiveRoute } from '@/lib/active-routes';
import {
  boundsFromPoints,
  enumerateTiles,
  MAX_OFFLINE_TILES,
  OFFLINE_MAX_ZOOM,
  OFFLINE_MIN_ZOOM,
} from '@/lib/offline/tile-math';
import { cacheTile } from '@/lib/offline/tile-cache';
import { saveOfflineRoute } from '@/lib/offline/route-store';

export type DownloadProgress = {
  phase: 'tiles' | 'done';
  done: number;
  total: number;
  failed: number;
};

export type DownloadResult =
  | { ok: true; tileCount: number; failed: number }
  | { ok: false; error: string };

function collectPoints(route: ActiveRoute): { lat: number; lng: number }[] {
  const points = route.waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
  for (const poi of [...route.resupply, ...route.water]) {
    points.push({ lat: poi.lat, lng: poi.lng });
  }
  return points;
}

export function estimateOfflineDownload(route: ActiveRoute): { tileCount: number; tooLarge: boolean } {
  const bounds = boundsFromPoints(collectPoints(route));
  const tiles = enumerateTiles(bounds, OFFLINE_MIN_ZOOM, OFFLINE_MAX_ZOOM);
  return { tileCount: tiles.length, tooLarge: tiles.length > MAX_OFFLINE_TILES };
}

export async function downloadRouteForOffline(
  route: ActiveRoute,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> {
  if (typeof indexedDB === 'undefined' || typeof caches === 'undefined') {
    return { ok: false, error: 'Offline storage is not supported in this browser.' };
  }

  const bounds = boundsFromPoints(collectPoints(route));
  const tiles = enumerateTiles(bounds, OFFLINE_MIN_ZOOM, OFFLINE_MAX_ZOOM);
  if (tiles.length > MAX_OFFLINE_TILES) {
    return {
      ok: false,
      error: `This route needs ${tiles.length} map tiles — too large for offline download. Try a shorter segment.`,
    };
  }

  let failed = 0;
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    const cached = await cacheTile(tile);
    if (!cached) failed++;
    onProgress?.({ phase: 'tiles', done: i + 1, total: tiles.length, failed });
  }

  await saveOfflineRoute({
    routeId: route.id,
    route,
    downloadedAt: new Date().toISOString(),
    tileCount: tiles.length - failed,
  });

  onProgress?.({ phase: 'done', done: tiles.length, total: tiles.length, failed });
  return { ok: true, tileCount: tiles.length - failed, failed };
}
