import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

// NOTE: middleware.ts matcher must be kept in sync with static-asset exclusions here.

const prodCSP = [
  "default-src 'self'",
  // blob: + gstatic/translate → Google Translate widget; clarity.ms → Microsoft Clarity (loaded via GTM)
  "script-src 'self' 'unsafe-inline' blob: https://www.googletagmanager.com https://www.google-analytics.com https://checkout.razorpay.com https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://www.clarity.ms https://*.clarity.ms",
  // gstatic/translate → Google Translate widget injected stylesheets
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com",
  // *.clarity.ms + c.bing.com → Clarity beacons; *.google-analytics.com → GA4 regional collectors; translate hosts → widget
  "connect-src 'self' https://api.bharatmock.com https://media.bharatmock.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://translate.googleapis.com https://translate.google.com https://www.gstatic.com https://*.clarity.ms https://c.bing.com",
  // translate.google.com → Google Translate renders translated content in an iframe
  "frame-src 'self' https://www.google.com https://maps.google.com https://checkout.razorpay.com https://translate.google.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const devCSP = "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval' blob:; img-src * data: blob:; connect-src *; frame-src *;";

const nextConfig = {
  distDir: '.next',
  poweredByHeader: false,
  compress: true,
  generateEtags: true,

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
    return [];
  },

};

export default withNextIntl(nextConfig);
