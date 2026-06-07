// Kill-switch service worker — self-destructing, no-op.
//
// We no longer use a service worker. Older builds (v1/v2) cached `/_next/static/`
// chunks cache-first and used skipWaiting() + clients.claim(), which made a
// freshly-activated SW seize the in-flight page load and intercept the stylesheet
// request mid-flight. The result: the page painted UNSTYLED on first open and only
// recovered after a manual refresh.
//
// The browser re-fetches this file as part of its normal SW update check, so any
// device still carrying an old SW will load THIS version, which:
//   1. installs immediately (skipWaiting),
//   2. deletes every Cache Storage entry (purging stale Next.js chunks/images),
//   3. unregisters itself, and
//   4. reloads any open tabs so they re-render WITH css.
//
// It intentionally registers NO `fetch` handler, so while it is briefly active it
// never intercepts a single request — HTML/CSS/JS go straight to the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge all caches left by previous SW versions.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Take control of open clients so the reload below applies to them...
      await self.clients.claim();

      // ...then remove this SW entirely. After this, no SW controls the site.
      await self.registration.unregister();

      // Reload open tabs once so a page that loaded under the old (CSS-breaking)
      // SW re-renders cleanly from the network without a manual refresh.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) client.navigate(client.url);
      }
    })()
  );
});
