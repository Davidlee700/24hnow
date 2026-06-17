import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og'],
        disallow: ['/admin', '/api/admin/', '/api/report', '/api/vote', '/api/comments', '/api/contact', '/auth/', '/stores/'],
      },
      {
        userAgent: 'Yeti',
        allow: ['/', '/api/og'],
        disallow: ['/admin', '/api/admin/', '/api/report', '/api/vote', '/api/comments', '/api/contact', '/auth/', '/stores/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
