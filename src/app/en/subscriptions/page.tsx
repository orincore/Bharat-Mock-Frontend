// Locale-prefixed alias for the subscriptions page so /en/subscriptions resolves
// instead of 404ing. Re-exports the original page's default + metadata.
export { default, metadata } from '@/app/subscriptions/page';
export const dynamic = 'force-dynamic';
