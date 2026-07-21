import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'hi'] as const;
const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_HEADER = 'x-next-locale';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

// Prefixes that must NEVER be edge-cached for anonymous visitors: APIs, build
// assets, and every user-specific / auth flow. Kept in sync with the Cloudflare
// Cache Rule expression so the origin and the edge never disagree.
const NO_CACHE_PREFIXES = [
  '/api/', '/_next/', '/assets/', '/icons/', '/images/',
  '/admin', '/profile', '/auth', '/login', '/register', '/results',
  '/onboarding', '/forgot-password', '/reset-password', '/subscriptions',
  '/thank-you',
];

function getLocaleFromPath(pathname: string): string | null {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
}

// Whether this response may be edge-cached by Cloudflare for anonymous visitors.
// Every content page is `force-dynamic`, so Next.js stamps each response with
// `Cache-Control: private, no-cache, no-store` — which makes Cloudflare bypass
// the cache. For anonymous, non-personalized page loads we override that with a
// public s-maxage below so the rendered SSR HTML can be edge-cached (~20ms
// instead of a 250-650ms origin render). Logged-in users (bm_session cookie)
// and RSC/prefetch navigations are never cached.
function isCacheableAnonymousPage(req: NextRequest): boolean {
  if (req.method !== 'GET') return false;
  const { pathname } = req.nextUrl;
  if (NO_CACHE_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  if (req.cookies.get('bm_session')) return false;               // logged-in → personalized SSR
  if (req.headers.get('rsc') === '1') return false;              // Next RSC payload, not HTML
  if (req.headers.get('next-router-prefetch') === '1') return false;
  return true;
}

function applyEdgeCacheHeaders(res: NextResponse) {
  // public + s-maxage → Cloudflare's shared edge caches for an hour; max-age=0 →
  // browsers ALWAYS revalidate (so a user who logs in never sees a stale
  // anonymous page from their own cache). The backend purge hook clears the
  // edge instantly on admin edits.
  //
  // Deliberately NO stale-while-revalidate: Cloudflare ignores the directive
  // (its serve-stale is a zone setting), so it would only affect browsers —
  // and since Traefik normalizes Vary to Accept-Encoding for Cloudflare's
  // benefit (see k8s/cluster/ingress.yaml in the backend repo), a browser
  // honoring SWR could serve cached page HTML for an RSC fetch of the same
  // URL. max-age=0 with no SWR forces browser revalidation every time, which
  // makes the Vary normalization safe.
  //
  // Note: Next.js MERGES (not replaces) middleware Vary with its own RSC vary
  // values, so the actual Vary fix lives at the Traefik ingress, not here.
  res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600');
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  // www → apex redirect
  if (hostname === 'www.bharatmock.com') {
    url.hostname = 'bharatmock.com';
    url.protocol = 'https';
    try { (url as any).port = ''; } catch { /* ignore */ }
    return NextResponse.redirect(url, 301);
  }

  // For locale-prefixed URLs (/hi/... or /en/...), inject the locale into the
  // request headers so i18n/request.ts picks it up BEFORE the root layout renders.
  // Real page files exist at src/app/hi/... so no rewrite is needed — just header injection.
  const localeFromPath = getLocaleFromPath(url.pathname);
  if (localeFromPath) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set(LOCALE_HEADER, localeFromPath);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    // Also persist as cookie so LanguageSelector stays in sync. NOTE: this
    // Set-Cookie makes the response un-cacheable at Cloudflare (by design — CF
    // won't cache Set-Cookie responses), so /hi|/en pages aren't edge-cached
    // via this path. English (root) pages are the primary caching win.
    response.cookies.set(LOCALE_COOKIE, localeFromPath, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    return response;
  }

  const response = NextResponse.next();
  if (isCacheableAnonymousPage(req)) applyEdgeCacheHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack|assets|favicon\\.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|icons|images).*)',
  ],
};
