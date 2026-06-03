// Service worker — IMAGES ONLY.
//
// It intentionally does NOT touch navigations or /_next/static/ (CSS & JS).
// Those hashed chunks are already served with `Cache-Control: immutable,
// max-age=31536000`, so the browser's own HTTP cache handles them perfectly.
// A SW caching them added no benefit and caused a first-load race: on a brand-new
// visit (especially in social-app in-app browsers) the just-installed SW would
// claim the page mid-load and intercept the stylesheet request, so the page
// rendered UNSTYLED until a manual refresh. Restricting the SW to images removes
// that race entirely while keeping the useful image cache.
//
// CACHE_VERSION is bumped to purge the old `bm-static-*` / `bm-images-*` caches
// (including the stale Next.js chunks) from devices that installed earlier builds.
const CACHE_VERSION = 'v3';
const IMAGE_CACHE = `bm-images-${CACHE_VERSION}`;

// Max images to keep in cache
const IMAGE_CACHE_LIMIT = 200;

// Hosts whose images we cache
const CACHEABLE_IMAGE_HOSTS = [
  'media.bharatmock.com',
  'bharatmock.com',
  '.r2.dev',
  '.r2.cloudflarestorage.com',
  'images.unsplash.com',
];

const isImageRequest = (request) => {
  const url = new URL(request.url);
  // Never handle Next.js static chunks or any same-origin /_next/* asset here —
  // let the browser load CSS/JS straight from the network/HTTP cache.
  if (url.pathname.startsWith('/_next/static/')) return false;
  const isCacheableHost = CACHEABLE_IMAGE_HOSTS.some((h) => url.hostname.includes(h));
  const isNextImage = url.pathname.startsWith('/_next/image');
  const isStaticImage = /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)(\?|$)/i.test(url.pathname);
  return isCacheableHost || isNextImage || isStaticImage;
};

// Trim cache to limit
const trimCache = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map((k) => cache.delete(k)));
  }
};

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        // Delete every cache that isn't the current image cache — this purges the
        // old bm-static-v2 / bm-images-v2 entries left by previous SW versions.
        keys.filter((k) => k !== IMAGE_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET image requests. Everything else (documents, CSS, JS, APIs)
  // goes straight to the network — the SW never interferes with them.
  if (request.method !== 'GET') return;
  if (!isImageRequest(request)) return;

  // Images — cache first, fall back to network, then cache the result.
  event.respondWith(
    caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
          trimCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
        }
        return response;
      } catch {
        return new Response('Image unavailable', { status: 503 });
      }
    })
  );
});
