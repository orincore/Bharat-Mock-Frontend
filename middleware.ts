import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'hi'] as const;
const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_HEADER = 'x-next-locale';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function getLocaleFromPath(pathname: string): string | null {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
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
    // Also persist as cookie so LanguageSelector stays in sync
    response.cookies.set(LOCALE_COOKIE, localeFromPath, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/webpack|assets|favicon\\.ico|robots\\.txt|sitemap\\.xml|llms\\.txt|icons|images).*)',
  ],
};
