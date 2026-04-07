import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  if (hostname === 'www.bharatmock.com') {
    url.hostname = 'bharatmock.com';
    url.protocol = 'https';
    // clear any port (so we don't redirect to e.g. :3000)
    try {
      // NextURL exposes `port` — clear it if present
      // @ts-ignore
      url.port = '';
    } catch (e) {
      // ignore if port cannot be set
    }

    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
