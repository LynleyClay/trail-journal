import { tileUrl, type TileCoord } from '@/lib/offline/tile-math';

export const TILE_CACHE_NAME = 'trail-journal-tiles-v1';

function cacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

export async function cacheTile(coord: TileCoord): Promise<boolean> {
  if (!cacheAvailable()) return false;
  const url = tileUrl(coord.z, coord.x, coord.y);
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) return false;
    const cache = await caches.open(TILE_CACHE_NAME);
    await cache.put(url, res.clone());
    return true;
  } catch {
    return false;
  }
}

export async function countCachedTiles(): Promise<number> {
  if (!cacheAvailable()) return 0;
  const cache = await caches.open(TILE_CACHE_NAME);
  const keys = await cache.keys();
  return keys.filter((req) => req.url.includes('opentopomap.org')).length;
}

export async function clearTileCache(): Promise<void> {
  if (!cacheAvailable()) return;
  await caches.delete(TILE_CACHE_NAME);
}

export async function isTileCached(coord: TileCoord): Promise<boolean> {
  if (!cacheAvailable()) return false;
  const cache = await caches.open(TILE_CACHE_NAME);
  const match = await cache.match(tileUrl(coord.z, coord.x, coord.y));
  return !!match;
}
