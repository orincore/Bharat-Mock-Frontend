const CACHE_VERSION = 'v2';
const IMAGE_CACHE = `bm-images-${CACHE_VERSION}`;
const STATIC_CACHE = `bm-static-${CACHE_VERSION}`;

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
  const isCacheableHost = CACHEABLE_IMAGE_HOSTS.some((h) => url.hostname.includes(h));
  const isNextImage = url.pathname.startsWith('/_next/image');
  const isStaticImage = /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)(\?|$)/i.test(url.pathname);
  return isCacheableHost || isNextImage || isStaticImage;
};

const isStaticAsset = (request) => {
  const url = new URL(request.url);
  // Never cache Next.js static chunks on localhost — Turbopack rebuilds them constantly
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return false;
  return url.pathname.startsWith('/_next/static/');
};

// Trim cache to limit
const trimCache = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map((k) => cache.delete(k)));
  }
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== IMAGE_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Static Next.js assets — cache first, immutable
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Images — cache first, fallback to network, then cache result
  if (isImageRequest(request)) {
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
    return;
  }
});
