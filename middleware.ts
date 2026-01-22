import { NextResponse, type NextRequest } from 'next/server';

const RESERVED_PREFIXES = new Set([
  '',
  'exams',
  'admin',
  'api',
  'login',
  'register',
  'profile',
  'results',
  'courses',
  'articles',
  'blog',
  '_next',
  'static',
  'images',
  'favicon.ico'
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/' ||
    pathname.match(/\.[a-zA-Z0-9]+$/)
  ) {
    return NextResponse.next();
  }

  const segments = pathname
    .split('/')
    .filter(Boolean);

  if (segments.length < 2 || RESERVED_PREFIXES.has(segments[0])) {
    return NextResponse.next();
  }

  const slug = segments[segments.length - 1];
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/exams/${slug}`;

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: '/:path*'
};
