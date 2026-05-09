import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/guide-data';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

async function getStoreEntries(): Promise<MetadataRoute.Sitemap> {
  const PAGE_SIZE = 1000;
  const entries: MetadataRoute.Sitemap = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, last_verified_at')
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      entries.push({
        url: `${BASE_URL}/stores/${row.id}`,
        lastModified: row.last_verified_at ? new Date(row.last_verified_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/notice`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const guideRoutes: MetadataRoute.Sitemap = getAllPosts().map(post => ({
    url: `${BASE_URL}/guide/${post.slug}`,
    lastModified: new Date(post.date.replace(/\./g, '-')),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const storeRoutes = await getStoreEntries();

  return [...staticRoutes, ...guideRoutes, ...storeRoutes];
}
