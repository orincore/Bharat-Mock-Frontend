import { NextRequest, NextResponse } from 'next/server';
import { internalApiHeaders } from '@/lib/server/internalApiHeaders';

// Same-origin fast path for AuthContext's startup check. The browser already
// carries the `bm_session` httpOnly cookie (set by the backend on
// login/register/refresh) to this route with zero CORS overhead — unlike a
// direct cross-origin call to the API domain, which requires a preflight
// OPTIONS round trip before the actual request. We just forward the cookie's
// token as a Bearer header to the existing /auth/profile endpoint.
//
// Deliberately NOT read in any page/layout — only this isolated route handler
// touches cookies, so it can't force the rest of the site off static/ISR
// rendering the way reading cookies() in a shared layout would.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const SESSION_COOKIE_NAME = 'bm_session';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    // 200, not 401: an anonymous visitor is the normal case, not an error —
    // a 401 here made every logged-out page load emit a browser console error
    // (flagged by Lighthouse Best Practices). AuthContext checks
    // `json.success && json.data`, so a success:false body behaves identically.
    return NextResponse.json({ success: false, authenticated: false, message: 'No session' });
  }

  // Forward the visitor's real IP + our internal-proxy secret so the backend
  // treats this as a trusted server-to-server call and does NOT collapse every
  // visitor's session check into a single (frontend-pod) rate-limit bucket —
  // the bug that returned 429 here for all users. See internalApiHeaders.
  const realClientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined;

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: internalApiHeaders(
        { Authorization: `Bearer ${token}` },
        realClientIp,
      ),
      cache: 'no-store',
    });

    // A non-2xx here (429 from a limiter, 5xx from a hiccup) must NEVER be
    // surfaced as a hard failure — the session check runs on every page load,
    // and a transient error should degrade to "not authenticated" so the page
    // still renders, not error the whole app. Only real success passes through.
    if (!upstream.ok) {
      if (upstream.status === 401) {
        // Expired/invalid cookie — normal, report as anonymous (200) to avoid a
        // browser console error on every logged-out load.
        return NextResponse.json({ success: false, authenticated: false, message: 'No session' });
      }
      return NextResponse.json({ success: false, message: 'Session check unavailable' });
    }

    const body = await upstream.json().catch(() => null);
    return NextResponse.json(body ?? { success: false, message: 'Invalid response' });
  } catch {
    // Network error reaching the API — degrade gracefully, never crash auth init.
    return NextResponse.json({ success: false, message: 'Session check failed' });
  }
}
