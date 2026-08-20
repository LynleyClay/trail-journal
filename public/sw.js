const TILE_CACHE = 'trail-journal-tiles-v1';
const APP_CACHE = 'trail-journal-app-v2';
const STATIC_CACHE = 'trail-journal-static-v2';

const PRECACHE_URLS = [
  '/hike.html',
  '/hike.js',
  '/hike.css',
  '/map?tab=active',
  '/map',
  '/manifest.webmanifest',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/marker-icon.png',
  '/vendor/leaflet/marker-icon-2x.png',
  '/vendor/leaflet/marker-shadow.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key === 'trail-journal-app-v1')
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isTopoTile(url) {
  return url.hostname.includes('opentopomap.org') && url.pathname.endsWith('.png');
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/vendor/') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.startsWith('/hike')
  );
}

async function matchTileByPath(cache, pathname) {
  const keys = await cache.keys();
  for (const req of keys) {
    if (new URL(req.url).pathname === pathname) {
      const match = await cache.match(req);
      if (match) return match;
    }
  }
  return undefined;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request.url, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const cached =
      (await cache.match(request.url)) ||
      (await cache.match(url.pathname)) ||
      (await cache.match('/hike.html')) ||
      (await cache.match('/map?tab=active')) ||
      (await cache.match('/map'));
    if (cached) return cached;
    return new Response(
      'Offline — open Trail Journal on WiFi once, download a route, then use /hike.html',
      { status: 503, headers: { 'Content-Type': 'text/plain' } },
    );
  }
}

self.addEventListener('fetch', (event) => {
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

  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
  }
});
