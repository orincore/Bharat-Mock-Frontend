import { NextRequest, NextResponse } from 'next/server';

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

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const body = await upstream.json().catch(() => null);
    // Map upstream 401 (expired/invalid cookie) to 200 as well — same
    // console-error rationale as the no-token case above.
    const status = upstream.status === 401 ? 200 : upstream.status;
    return NextResponse.json(body ?? { success: false, message: 'Invalid response' }, { status });
  } catch {
    return NextResponse.json({ success: false, message: 'Session check failed' }, { status: 502 });
  }
}
