import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, CATEGORY_GRADIENTS, GuideCategory } from '@/lib/guide-data';

export const metadata: Metadata = {
  title: '심야 가이드 | 24시나우',
  description: '동별 심야 카페·편의점·세차장 TOP 10 큐레이션. 밤샘 공간을 찾는 당신을 위한 가이드.',
  openGraph: {
    title: '심야 가이드 | 24시나우',
    description: '동별 심야 카페·편의점·세차장 TOP 10 큐레이션.',
    url: 'https://24now.kr/guide',
  },
};

const CATEGORY_FILTERS: { label: string; value: GuideCategory | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '카페', value: '카페' },
  { label: '편의점', value: '편의점' },
  { label: '세차장', value: '세차장' },
];

interface Props {
  searchParams: Promise<{ category?: string; city?: string }>;
}

export default async function GuidePage({ searchParams }: Props) {
  const { category, city } = await searchParams;
  const all = getAllPosts();

  const cities = Array.from(new Set(all.filter(p => p.city).map(p => p.city!)));
  const showCityFilter = cities.length >= 2;

  const posts = all.filter(p => {
    const catMatch = !category || category === 'all' || p.category === category;
    const cityMatch = !city || city === 'all' || p.city === city;
    return catMatch && cityMatch;
  });

  return (
    <div className="guide-page">
      {/* 상단 네비 */}
      <header className="guide-header">
        <Link href="/" className="guide-header-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>지도</span>
        </Link>
        <h1 className="guide-header-title">심야 가이드</h1>
        <div style={{ width: 64 }} />
      </header>

      {/* 카테고리 필터 */}
      <div className="guide-filter-bar">
        {CATEGORY_FILTERS.map(f => (
          <Link
            key={f.value}
            href={
              f.value === 'all'
                ? city && city !== 'all' ? `/guide?city=${city}` : '/guide'
                : `/guide?category=${f.value}${city && city !== 'all' ? `&city=${city}` : ''}`
            }
            className={`guide-filter-chip ${(!category && f.value === 'all') || category === f.value ? 'active' : ''}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* 지역(시) 필터 */}
      {showCityFilter && (
        <div className="guide-filter-bar" style={{ paddingTop: 8 }}>
          <Link
            href={city && city !== 'all'
              ? `/guide${category && category !== 'all' ? `?category=${category}` : ''}`
              : '/guide'}
            className={`guide-filter-chip ${!city || city === 'all' ? 'active' : ''}`}
          >
            전체
          </Link>
          {cities.map(c => (
            <Link
              key={c}
              href={`/guide?city=${c}${category && category !== 'all' ? `&category=${category}` : ''}`}
              className={`guide-filter-chip ${city === c ? 'active' : ''}`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {/* 게시글 목록 */}
      <main className="guide-list">
        {posts.length === 0 ? (
          <div className="guide-empty">
            <span>아직 게시글이 없어요</span>
            <span>곧 업로드할게요 🌙</span>
          </div>
        ) : (
          posts.map(post => (
            <Link key={post.slug} href={`/guide/${post.slug}`} className="guide-card">
              {/* 썸네일 */}
              <div
                className="guide-card-thumbnail"
                style={{ background: post.gradient || CATEGORY_GRADIENTS[post.category] }}
              >
                <div className="guide-card-thumbnail-inner">
                  <span className="guide-card-region">{post.region}</span>
                  <span className="guide-card-category-icon">
                    {post.category === '카페' ? '☕' : post.category === '편의점' ? '🏪' : '🚿'}
                  </span>
                </div>
              </div>

              {/* 본문 */}
              <div className="guide-card-body">
                <div className="guide-card-tags">
                  <span className="guide-tag">{post.category}</span>
                  <span className="guide-tag">{post.region}</span>
                </div>
                <p className="guide-card-title">{post.title}</p>
                <p className="guide-card-desc">{post.description}</p>
                <div className="guide-card-meta">
                  <span>{post.date}</span>
                  <span>·</span>
                  <span>읽는 데 {post.readTime}분</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
