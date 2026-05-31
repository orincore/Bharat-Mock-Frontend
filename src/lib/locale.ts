'use client';

import { usePathname } from 'next/navigation';

// Roots that have NO locale-prefixed route — never prefix these or we'd create 404s.
// (Exam-by-id / attempt routes and auth pages live only at the root.)
const NON_LOCALIZED_PREFIXES = [
  '/exams',
  '/login',
  '/register',
  '/auth',
  '/admin',
  '/onboarding',
  '/forgot-password',
  '/reset-password',
];

export function getLocalePrefixFromPath(pathname: string | null | undefined): '' | '/hi' | '/en' {
  if (pathname === '/hi' || pathname?.startsWith('/hi/')) return '/hi';
  if (pathname === '/en' || pathname?.startsWith('/en/')) return '/en';
  return '';
}

/** Prefix an internal path with the active locale, unless it's already prefixed
 *  or points at a root-only route (see NON_LOCALIZED_PREFIXES). */
export function applyLocale(prefix: '' | '/hi' | '/en', path: string): string {
  if (!prefix || typeof path !== 'string' || !path.startsWith('/')) return path;
  if (path === prefix || path.startsWith(prefix + '/')) return path; // already localized
  const base = path.split(/[?#]/)[0];
  if (NON_LOCALIZED_PREFIXES.some((p) => base === p || base.startsWith(p + '/'))) return path;
  return `${prefix}${path}`;
}

/** Hook returning a `withLocale(path)` bound to the current pathname's locale. */
export function useWithLocale() {
  const prefix = getLocalePrefixFromPath(usePathname());
  return (path: string) => applyLocale(prefix, path);
}
