import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block _vercel health check paths from hitting the catch-all
  if (pathname.startsWith('/_vercel')) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/_vercel/:path*'],
};
