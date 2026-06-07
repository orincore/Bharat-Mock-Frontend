"use client";

import { useEffect } from "react";

/**
 * Service-worker DEREGISTRATION.
 *
 * We no longer ship a service worker. Older builds installed a SW that did
 * cache-first interception of `/_next/static/` chunks and used
 * skipWaiting() + clients.claim(). On a fresh visit the just-activated SW would
 * seize the in-flight page load and intercept the stylesheet request mid-flight,
 * so the page painted UNSTYLED until a manual refresh ("CSS lost on open, back on
 * refresh"). The marginal image cache it provided wasn't worth that regression —
 * images already ship long `immutable` cache headers.
 *
 * This component now proactively removes any previously-installed SW and purges
 * its caches on every device/environment so no SW ever intercepts a request
 * again. Requests (HTML, CSS, JS) always go straight to the network + HTTP cache.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((reg) => reg.unregister()))
        .catch(() => {});
    }

    // Purge any caches left behind by old SW versions (bm-static-*, bm-images-*),
    // which may still hold stale Next.js chunks.
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);

  return null;
}
