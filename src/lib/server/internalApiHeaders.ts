// Headers for SERVER-SIDE fetches from the Next.js frontend to the BharatMock
// backend (SSR/ISR page data, the /api/session -> /auth/profile hop, route
// handlers). These calls all leave the same frontend pod, so at the API edge
// Cloudflare stamps cf-connecting-ip with that pod's IP and every visitor
// collapses into ONE backend rate-limit bucket. Under real traffic that bucket
// trips within seconds — /api/session returns 429 for everyone and SSR fetches
// 429 -> notFound() -> 404 site-wide.
//
// INTERNAL_PROXY_SECRET is a server-only env var (NEVER prefixed NEXT_PUBLIC, so
// it never reaches the browser). The backend recognises it and exempts these
// trusted server-to-server calls from IP rate limiting. Optionally we forward
// the visitor's real IP so per-user limits still apply where wanted.
//
// If the secret is unset the headers are simply omitted — the request still
// works, it just isn't exempted, so keep the two deployments' secrets in sync.
export function internalApiHeaders(
  extra?: Record<string, string>,
  realClientIp?: string,
): Record<string, string> {
  const secret = process.env.INTERNAL_PROXY_SECRET;
  const headers: Record<string, string> = { ...(extra || {}) };
  if (secret) {
    headers['x-internal-proxy-secret'] = secret;
    if (realClientIp) headers['x-real-client-ip'] = realClientIp;
  }
  return headers;
}
