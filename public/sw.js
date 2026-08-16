/// <reference lib="webworker" />

const TILE_CACHE = 'trail-journal-tiles-v1';
const APP_CACHE = 'trail-journal-app-v1';

const PRECACHE_URLS = [
  '/map',
  '/manifest.webmanifest',
  '/leaflet/marker-icon.png',
  '/leaflet/marker-icon-2x.png',
  '/leaflet/marker-shadow.png',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

function isTopoTile(url: URL): boolean {
  return url.hostname.includes('opentopomap.org') && url.pathname.endsWith('.png');
}

async function matchTileByPath(cache: Cache, pathname: string): Promise<Response | undefined> {
  const keys = await cache.keys();
  for (const req of keys) {
    if (new URL(req.url).pathname === pathname) {
      const match = await cache.match(req);
      if (match) return match;
    }
  }
  return undefined;
}

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (isTopoTile(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          const byPath = await matchTileByPath(cache, url.pathname);
          if (byPath) return byPath;
          return new Response('', { status: 504, statusText: 'Offline tile missing' });
        }
      }),
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(APP_CACHE);
        return (
          (await cache.match('/map')) ??
          (await cache.match('/')) ??
          new Response('Offline — open Trail Journal while connected first, then use My Current Routes.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        );
      }),
    );
  }
});
