import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/profile/',
          '/onboarding/',
          '/results/',
          '/exams/*/attempt/',
          '/forgot-password',
          '/reset-password',
          '/register',
          '/login',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/results/',
          '/exams/*/attempt/',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/results/', '/profile/'],
      },
      {
        userAgent: 'Claude-Web',
        allow: '/',
        disallow: ['/admin/', '/api/', '/results/', '/profile/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/results/', '/profile/'],
      },
    ],
    sitemap: 'https://bharatmock.com/sitemap.xml',
    host: 'https://bharatmock.com',
  };
}
