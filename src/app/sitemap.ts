import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/guide-data';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { LANDING_CATEGORIES, extractCitySlug, type LandingCategory } from '@/lib/landingData';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

async function getLandingEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { data } = await supabaseAdmin
      .from('stores')
      .select('road_address, category')
      .in('operation_type', ['24H', 'EXTENDED', 'REGULAR'])
      .not('road_address', 'is', null)
      .limit(50000);

    if (!data) return [];

    const counts = new Map<string, number>();
    for (const row of data) {
      const city = extractCitySlug(row.road_address as string);
      const cat = row.category as string;
      if (!city || !LANDING_CATEGORIES.includes(cat as LandingCategory)) continue;
      const key = `${city}|${cat}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .filter(([, n]) => n >= 5)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 300)
      .map(([key]) => {
        const [city, category] = key.split('|');
        return {
          url: `${BASE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(category)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        };
      });
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/guide`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/notice`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const guideRoutes: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${BASE_URL}/guide/${post.slug}`,
    lastModified: new Date(post.date.replace(/\./g, '-')),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const landingRoutes = await getLandingEntries();

  return [...staticRoutes, ...guideRoutes, ...landingRoutes];
}
