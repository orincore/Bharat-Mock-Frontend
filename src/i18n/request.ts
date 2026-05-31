import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const LOCALES = ['en', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export default getRequestConfig(async () => {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);

  // x-next-locale is injected by middleware for /hi/... and /en/... URLs.
  // It runs before the root layout so this is always the correct value for locale URLs.
  const fromHeader = headersList.get('x-next-locale');
  const fromCookie = cookieStore.get('NEXT_LOCALE')?.value;

  const raw = fromHeader ?? fromCookie ?? DEFAULT_LOCALE;
  const locale: Locale = (LOCALES as readonly string[]).includes(raw)
    ? (raw as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
