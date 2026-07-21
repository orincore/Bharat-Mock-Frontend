import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

// NOTE: middleware.ts matcher must be kept in sync with static-asset exclusions here.

const prodCSP = [
  "default-src 'self'",
  // blob: + gstatic/translate → Google Translate widget; clarity.ms → Microsoft Clarity (loaded via GTM); *.razorpay.com → checkout loads risk-detection from cdn.razorpay.com;
  // static.cloudflareinsights.com → Cloudflare's own RUM beacon, auto-injected on every response once the zone is proxied (orange-clouded) — not something GTM controls, blocking it just logs a console error, it doesn't disable it; connect.facebook.net → Meta Pixel, loaded via GTM
  "script-src 'self' 'unsafe-inline' blob: https://www.googletagmanager.com https://www.google-analytics.com https://*.razorpay.com https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://www.clarity.ms https://*.clarity.ms https://static.cloudflareinsights.com https://connect.facebook.net",
  // gstatic/translate → Google Translate widget injected stylesheets
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com",
  // *.clarity.ms + c.bing.com → Clarity beacons; *.google-analytics.com + analytics.google.com + www.google.com → GA4 collectors (gtag sends /g/collect to all three); translate hosts → widget;
  // cloudflareinsights.com → the beacon's own report call; www.facebook.com → Meta Pixel's /tr tracking call
  "connect-src 'self' https://api.bharatmock.com https://media.bharatmock.com https://*.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://translate.google.com https://www.gstatic.com https://*.clarity.ms https://c.bing.com https://cloudflareinsights.com https://www.facebook.com https://stats.g.doubleclick.net",
  // translate.google.com → Google Translate iframe; *.razorpay.com → checkout frames api.razorpay.com for 3DS/payment flows
  "frame-src 'self' https://www.google.com https://maps.google.com https://*.razorpay.com https://translate.google.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const devCSP = "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval' blob:; img-src * data: blob:; connect-src *; frame-src *;";

const nextConfig = {
  distDir: '.next',
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  // Self-hosted on KVM2 (k3s) — standalone bundles only the traced production
  // deps into .next/standalone, instead of shipping the full node_modules
  // into the image. Doesn't affect the Vercel deploy path if that's ever used
  // again; Vercel ignores this option and builds its own output regardless.
  output: 'standalone',

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'bharatmock.com' },
      { protocol: 'https', hostname: '*.bharatmock.com' },
      { protocol: 'https', hostname: 'media.bharatmock.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: true,
    unoptimized: false,
  },

  // optimizePackageImports is experimental in Next.js 16
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'recharts',
    ],
  },

  trailingSlash: false,

  async headers() {
    const rules = [
      // Admin pages — no indexing
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      // Images — long cache
      {
        source: '/:path*.{jpg,jpeg,png,gif,webp,avif,svg,ico}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Security headers for all pages
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Content-Security-Policy for all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: isDev ? devCSP : prodCSP },
        ],
      },
    ];

    // Only add static asset cache header in production — dev handles this internally
    if (!isDev) {
      rules.splice(1, 0, {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      });
    }

    return rules;
  },

  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // Domain-verification file: served from public/ as a .txt but the verifier
      // fetches the extensionless path. Rewrite keeps the clean URL.
      {
        source: '/665e21249c884b708a565afab6ed711e',
        destination: '/665e21249c884b708a565afab6ed711e.txt',
      },
    ];
  },

};

export default withNextIntl(nextConfig);
