import { NextRequest, NextResponse } from 'next/server';

// Why this exists: the media CDN (media.bharatmock.com / R2) serves images
// WITHOUT an `Access-Control-Allow-Origin` header. Client-side PDF generation
// (admin PDF generator) draws those images onto a <canvas> and calls
// `toDataURL()`, which throws a SecurityError on a CORS-tainted canvas — so
// question/option images were silently dropped from the PDF. Routing the image
// through this same-origin proxy removes the cross-origin taint entirely.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// SSRF guard: only proxy images from hosts we actually serve media from.
// Mirrors the image `remotePatterns` in next.config.mjs.
const isAllowedHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  return (
    host === 'bharatmock.com' ||
    host.endsWith('.bharatmock.com') ||
    host.endsWith('.r2.cloudflarestorage.com') ||
    host.endsWith('.r2.dev') ||
    host === 'images.unsplash.com'
  );
};

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      // Revalidate against the CDN but let Next/Vercel cache the proxied bytes.
      next: { revalidate: 86400 },
      headers: { Accept: 'image/*' },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        // Same-origin response, but set ACAO so a crossOrigin <img> fallback is also clean.
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    console.error('[proxy-image] Failed to fetch', parsed.toString(), e?.message);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
  }
}
