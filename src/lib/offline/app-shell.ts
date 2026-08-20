export const OFFLINE_SHELL_URLS = [
  '/hike.html',
  '/hike.js',
  '/hike.css',
  '/sw.js',
  '/manifest.webmanifest',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/marker-icon.png',
  '/vendor/leaflet/marker-icon-2x.png',
  '/vendor/leaflet/marker-shadow.png',
  '/map?tab=active',
];

export const APP_SHELL_CACHE = 'trail-journal-app-v2';
export const STATIC_CACHE = 'trail-journal-static-v2';

export async function precacheOfflineShell(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const cache = await caches.open(APP_SHELL_CACHE);
  let cached = 0;
  for (const path of OFFLINE_SHELL_URLS) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) {
        await cache.put(path, res.clone());
        cached++;
      }
    } catch {
      // continue with other assets
    }
  }

  // Cache JS/CSS chunks already loaded on this page (Next.js bundles).
  const assetPaths = new Set<string>();
  if (typeof document !== 'undefined') {
    document.querySelectorAll('script[src]').forEach((node) => {
      const src = node.getAttribute('src');
      if (src?.startsWith('/')) assetPaths.add(src.split('?')[0]!);
    });
    document.querySelectorAll('link[rel="stylesheet"][href]').forEach((node) => {
      const href = node.getAttribute('href');
      if (href?.startsWith('/')) assetPaths.add(href.split('?')[0]!);
    });
  }

  const staticCache = await caches.open(STATIC_CACHE);
  for (const path of assetPaths) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok) {
        await staticCache.put(path, res.clone());
        cached++;
      }
    } catch {
      // optional runtime chunks
    }
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }

  return cached;
}

export function offlineHikeUrl(): string {
  if (typeof window === 'undefined') return '/hike.html';
  return `${window.location.origin}/hike.html`;
}
