'use client';

import { useReportWebVitals } from 'next/web-vitals';

// Optional self-hosted sink for raw metrics (e.g. your backend or an edge function).
// Leave unset to rely solely on GTM/GA4.
const VITALS_ENDPOINT = process.env.NEXT_PUBLIC_VITALS_ENDPOINT;
// Set NEXT_PUBLIC_VITALS_DEBUG=true to log metrics in the console (works on localhost too).
const DEBUG = process.env.NEXT_PUBLIC_VITALS_DEBUG === 'true';

/**
 * Captures real-user Core Web Vitals (LCP, INP, CLS, FCP, TTFB) plus Next.js
 * custom metrics and forwards them to analytics. This is *field* data measured
 * on real devices — independent of Chrome UX Report (CrUX), so it works
 * immediately instead of waiting weeks for Search Console to populate.
 *
 * Primary sink is the GTM dataLayer (this site loads GTM). To land the data in
 * GA4, create in GTM:
 *   1. A "Custom Event" trigger on event name `web_vitals`.
 *   2. A GA4 Event tag (event name `web_vitals`) mapping the dataLayer vars
 *      below (web_vitals_metric, web_vitals_value, web_vitals_rating, ...) to
 *      event parameters, fired on that trigger.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const { id, name, value, label } = metric;
    // `rating`, `delta`, and `navigationType` come from the web-vitals library
    // for web-vital metrics; they are absent on Next.js custom metrics.
    const rating = (metric as { rating?: string }).rating;
    const delta = (metric as { delta?: number }).delta;
    const navigationType = (metric as { navigationType?: string }).navigationType;

    // GA4 event `value` must be an integer. CLS is a small unitless decimal,
    // so scale it by 1000; everything else is already in milliseconds.
    const round = (n: number) => Math.round(name === 'CLS' ? n * 1000 : n);
    const roundedValue = round(value);
    const roundedDelta = typeof delta === 'number' ? round(delta) : roundedValue;

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[web-vitals]', name, { value, rating, delta, id });
    }

    if (typeof window === 'undefined') return;

    // Don't pollute production analytics with local dev measurements.
    const isLocalhost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
    if (isLocalhost && !DEBUG) return;

    const page = window.location.pathname;

    // Primary sink: Google Tag Manager dataLayer.
    const dataLayer = ((window as any).dataLayer = (window as any).dataLayer || []);
    dataLayer.push({
      event: 'web_vitals',
      web_vitals_metric: name, // LCP | INP | CLS | FCP | TTFB | Next.js-*
      web_vitals_label: label, // 'web-vital' | 'custom'
      web_vitals_value: roundedValue,
      web_vitals_delta: roundedDelta,
      web_vitals_rating: rating ?? null, // 'good' | 'needs-improvement' | 'poor'
      web_vitals_id: id,
      web_vitals_navigation_type: navigationType ?? null,
      page_path: page,
    });

    // Fallback: if GA4/gtag.js is loaded directly (not via GTM), report there too.
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function' && label === 'web-vital') {
      gtag('event', name, {
        value: roundedValue,
        metric_id: id,
        metric_value: value,
        metric_delta: roundedDelta,
        metric_rating: rating,
        event_category: 'Web Vitals',
        non_interaction: true,
      });
    }

    // Optional: ship raw metrics to your own endpoint for full control / dashboards.
    if (VITALS_ENDPOINT) {
      const body = JSON.stringify({ id, name, label, value, delta, rating, navigationType, page, ts: Date.now() });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(VITALS_ENDPOINT, body);
      } else {
        fetch(VITALS_ENDPOINT, {
          method: 'POST',
          body,
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
        }).catch(() => {});
      }
    }
  });

  return null;
}
