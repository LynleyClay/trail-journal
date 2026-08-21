const TILE_CACHE = 'trail-journal-tiles-v1';
const APP_CACHE = 'trail-journal-app-v7';
const STATIC_CACHE = 'trail-journal-static-v7';
const RUNTIME_CACHE = 'trail-journal-runtime-v7';

const OFFLINE_HOME = '/map?tab=active';

const PRECACHE_URLS = [
  OFFLINE_HOME,
  '/map',
  '/',
  '/drafts',
  '/admin/new',
  '/manifest.webmanifest',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/marker-icon.png',
  '/vendor/leaflet/marker-icon-2x.png',
  '/vendor/leaflet/marker-shadow.png',
  '/hike.html',
  '/hike.js',
  '/hike.css',
  '/offline-draft.js?v=10',
];

const OLD_CACHES = [
  'trail-journal-app-v1',
  'trail-journal-app-v2',
  'trail-journal-app-v3',
  'trail-journal-app-v4',
  'trail-journal-app-v5',
  'trail-journal-app-v6',
  'trail-journal-static-v2',
  'trail-journal-static-v3',
  'trail-journal-static-v4',
  'trail-journal-static-v5',
  'trail-journal-static-v6',
  'trail-journal-runtime-v3',
  'trail-journal-runtime-v4',
  'trail-journal-runtime-v5',
  'trail-journal-runtime-v6',
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
      .then((keys) => Promise.all(keys.filter((key) => OLD_CACHES.includes(key)).map((key) => caches.delete(key))))
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

function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
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

async function readFromCaches(request) {
  for (const cacheName of [RUNTIME_CACHE, STATIC_CACHE, APP_CACHE]) {
    const cache = await caches.open(cacheName);
    const match = await cache.match(request);
    if (match) return match;
  }
  return undefined;
}

async function storeInRuntime(request, response) {
  if (!response.ok) return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
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
    const fallback = await readFromCaches(request);
    return fallback || Response.error();
  }
}

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request.url, response.clone());
      await storeInRuntime(request, response);
    }
    return response;
  } catch {
    const cached =
      (await cache.match(request.url)) ||
      (await cache.match(new URL(request.url).pathname)) ||
      (await readFromCaches(request));
    if (cached) return cached;

    if (request.mode === 'navigate') {
      return (
        (await cache.match(OFFLINE_HOME)) ||
        (await cache.match('/map')) ||
        new Response('Offline — download a route on WiFi first.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        })
      );
    }
    return Response.error();
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

  if (isApiRequest(url.pathname)) {
    return;
  }

  if (url.pathname.startsWith('/vendor/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(networkFirstWithCache(event.request, STATIC_CACHE));
    return;
  }

  if (
    event.request.mode === 'navigate' ||
    event.request.headers.get('RSC') === '1' ||
    event.request.headers.get('Next-Router-Prefetch') === '1'
  ) {
    event.respondWith(networkFirstWithCache(event.request, APP_CACHE));
    return;
  }

  event.respondWith(networkFirstWithCache(event.request, RUNTIME_CACHE));
});
