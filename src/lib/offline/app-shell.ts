export const OFFLINE_APP_PAGES = ['/map?tab=active', '/map', '/'];

export const OFFLINE_SHELL_URLS = [
  '/manifest.webmanifest',
  '/vendor/leaflet/leaflet.css',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/marker-icon.png',
  '/vendor/leaflet/marker-icon-2x.png',
  '/vendor/leaflet/marker-shadow.png',
  '/hike.html',
  '/hike.js',
  '/hike.css',
  ...OFFLINE_APP_PAGES,
];

export const APP_SHELL_CACHE = 'trail-journal-app-v3';
export const STATIC_CACHE = 'trail-journal-static-v3';
export const RUNTIME_CACHE = 'trail-journal-runtime-v3';

function extractAssetPaths(html: string): string[] {
  const paths = new Set<string>();
  const patterns = [
    /\/_next\/static\/[^"'\\s>]+/g,
    /\/vendor\/[^"'\\s>]+/g,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      paths.add(match[0].split('?')[0]!);
    }
  }
  return [...paths];
}

function loadedAssetPaths(): string[] {
  if (typeof document === 'undefined') return [];
  const paths = new Set<string>();
  document.querySelectorAll('script[src]').forEach((node) => {
    const src = node.getAttribute('src');
    if (src?.startsWith('/')) paths.add(src.split('?')[0]!);
  });
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach((node) => {
    const href = node.getAttribute('href');
    if (href?.startsWith('/')) paths.add(href.split('?')[0]!);
  });
  return [...paths];
}

async function cachePath(path: string, cacheName: string): Promise<boolean> {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return false;
    const cache = await caches.open(cacheName);
    await cache.put(path, res.clone());
    return true;
  } catch {
    return false;
  }
}

async function cacheHtmlAndAssets(pagePath: string): Promise<number> {
  let cached = 0;
  try {
    const res = await fetch(pagePath, { cache: 'no-store' });
    if (res.ok) {
      const html = await res.text();
      const appCache = await caches.open(APP_SHELL_CACHE);
      await appCache.put(pagePath, new Response(html, { headers: res.headers }));
      cached++;

      const assets = extractAssetPaths(html);
      for (const asset of assets) {
        if (await cachePath(asset, STATIC_CACHE)) cached++;
      }
    }
  } catch {
    // page may fail partially
  }
  return cached;
}

function warmAppInBackground(pagePath: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.hidden = true;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.src = pagePath;
    const finish = () => {
      iframe.remove();
      resolve();
    };
    iframe.onload = () => window.setTimeout(finish, 6000);
    iframe.onerror = finish;
    document.body.appendChild(iframe);
    window.setTimeout(finish, 12000);
  });
}

/** Cache the full Trail Journal app shell so /map opens offline after download. */
export async function precacheOfflineShell(): Promise<number> {
  if (typeof caches === 'undefined') return 0;

  let cached = 0;
  for (const path of OFFLINE_SHELL_URLS) {
    if (await cachePath(path, APP_SHELL_CACHE)) cached++;
  }

  for (const page of OFFLINE_APP_PAGES) {
    cached += await cacheHtmlAndAssets(page);
  }

  for (const path of loadedAssetPaths()) {
    if (await cachePath(path, STATIC_CACHE)) cached++;
  }

  await warmAppInBackground('/map?tab=active');

  for (const path of loadedAssetPaths()) {
    if (await cachePath(path, STATIC_CACHE)) cached++;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }

  return cached;
}
