import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/guide-data';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

const STORES_PER_SITEMAP = 45000;

export async function generateSitemaps() {
  const { count } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true });

  const total = count ?? 0;
  const numStoresMaps = Math.max(1, Math.ceil(total / STORES_PER_SITEMAP));

  const ids = [{ id: 'main' }];
  for (let i = 0; i < numStoresMaps; i++) {
    ids.push({ id: `stores-${i}` });
  }
  return ids;
}

async function getStoreEntries(page: number): Promise<MetadataRoute.Sitemap> {
  const from = page * STORES_PER_SITEMAP;
  const to = from + STORES_PER_SITEMAP - 1;

  const { data } = await supabase
    .from('stores')
    .select('id, last_verified_at')
    .range(from, to);

  if (!data) return [];

  return data.map(row => ({
    url: `${BASE_URL}/stores/${row.id}`,
    lastModified: row.last_verified_at ? new Date(row.last_verified_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  if (id === 'main') {
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

    return [...staticRoutes, ...guideRoutes];
  }

  const pageNum = parseInt(id.replace('stores-', ''), 10);
  if (isNaN(pageNum)) return [];

  return getStoreEntries(pageNum);
}
