import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Store } from '@/types/store';
import { LANDING_CATEGORIES, CATEGORY_META, extractCitySlug, type LandingCategory } from '@/lib/landingData';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';

type Params = Promise<{ city: string; category: string }>;

/** Build time: derive valid city×category combinations from real store data */
export async function generateStaticParams() {
  const { data } = await supabase
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
      return { city, category };
    });
}

async function getStores(city: string, category: string): Promise<Store[]> {
  const { data } = await supabase
    .from('stores')
    .select('*')
    .ilike('road_address', `%${city}%`)
    .eq('category', category)
    .in('operation_type', ['24H', 'EXTENDED', 'REGULAR'])
    .order('trust_score', { ascending: false })
    .limit(20);
  return (data ?? []) as Store[];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city, category } = await params;
  const meta = CATEGORY_META[category as LandingCategory];
  if (!meta) return { title: '24시나우' };

  const title = `${city} ${meta.keyword} | 24시나우`;
  const description = `${city}에서 지금 영업 중인 ${meta.keyword}을 지도에서 바로 찾아보세요. 새벽에도 문 여는 곳, 24시나우.`;
  const ogParams = new URLSearchParams({ name: `${city} ${meta.keyword}`, category, region: city, status: 'open' });

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(category)}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(category)}`,
      siteName: '24시나우',
      locale: 'ko_KR',
      type: 'website',
      images: [{ url: `${BASE_URL}/api/og?${ogParams.toString()}`, width: 1200, height: 630 }],
    },
  };
}

export default async function LandingPage({ params }: { params: Params }) {
  const { city, category } = await params;
  const meta = CATEGORY_META[category as LandingCategory];
  if (!meta) notFound();

  const stores = await getStores(city, category);
  if (stores.length === 0) notFound();

  const otherCategories = LANDING_CATEGORIES.filter(c => c !== category);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${city} ${meta.keyword}`,
    description: `${city}에서 영업 중인 ${meta.keyword} 목록`,
    url: `${BASE_URL}/${encodeURIComponent(city)}/${encodeURIComponent(category)}`,
    numberOfItems: stores.length,
    itemListElement: stores.map((store, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: store.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: store.road_address,
          addressCountry: 'KR',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: store.latitude,
          longitude: store.longitude,
        },
        url: `${BASE_URL}/stores/${store.id}`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="app-wrapper">
        <div className="landing-page">

          {/* 헤더 */}
          <header className="guide-header">
            <Link href="/" className="guide-header-back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>지도</span>
            </Link>
            <h2 className="guide-header-title">{city} {category}</h2>
            <Link href="/" className="guide-map-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              지도 열기
            </Link>
          </header>

          {/* 히어로 */}
          <section className="landing-hero">
            <div className="landing-hero-emoji">{meta.emoji}</div>
            <div className="landing-hero-count">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-neon)', display: 'inline-block' }} />
              {stores.length}곳 확인됨
            </div>
            <h1 className="landing-hero-title">
              {city} {meta.keyword}
            </h1>
            <p className="landing-hero-desc">
              새벽에도, 연휴에도 — {city}에서 지금 이용 가능한 {category}을 지도에서 바로 찾아보세요.
            </p>
            <Link href="/" className="landing-map-cta">
              지도에서 보기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </section>

          {/* 매장 목록 */}
          <main className="landing-store-list">
            {stores.map(store => (
              <Link key={store.id} href={`/stores/${store.id}`} className="landing-store-card">
                <div className="landing-store-card-top">
                  <span className="landing-store-name">{store.name}</span>
                  {store.operation_type === '24H'
                    ? <span className="landing-store-badge open-24">24시간</span>
                    : <span className="landing-store-badge extended">심야영업</span>
                  }
                </div>
                <span className="landing-store-address">{store.road_address}</span>
              </Link>
            ))}
          </main>

          {/* 다른 카테고리 */}
          <p className="landing-section-title">{city}의 다른 24시 장소</p>
          <div className="landing-chips">
            {otherCategories.map(cat => (
              <Link
                key={cat}
                href={`/${encodeURIComponent(city)}/${encodeURIComponent(cat)}`}
                className="landing-chip"
              >
                {CATEGORY_META[cat].emoji} {cat}
              </Link>
            ))}
          </div>

          {/* 하단 */}
          <footer className="landing-footer">
            <Link href="/" className="landing-footer-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              24시나우 지도로 돌아가기
            </Link>
          </footer>

        </div>
      </div>
    </>
  );
}
