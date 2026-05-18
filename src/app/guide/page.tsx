import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, CATEGORY_GRADIENTS, GuideCategory } from '@/lib/guide-data';

export const metadata: Metadata = {
  title: '24시간 심야 가이드 | 카페·약국·찜질방·세차장 — 서울·부산·대구·강릉 | 24시나우',
  description: '서울·부산·대구·대전·광주·강릉 24시간 카페·약국·찜질방·코인노래방·셀프빨래방·셀프세차장 큐레이션. 새벽에도 문 여는 곳을 지역별로 직접 선별했습니다.',
  alternates: { canonical: 'https://24now.kr/guide' },
  openGraph: {
    title: '24시간 심야 가이드 | 카페·약국·찜질방 — 서울·부산·대구·강릉 | 24시나우',
    description: '서울·부산·대구·대전·광주·강릉 24시간 카페·약국·찜질방 큐레이션. 새벽에도 문 여는 곳.',
    url: 'https://24now.kr/guide',
  },
};

const CATEGORY_FILTERS: { label: string; value: GuideCategory | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '카페', value: '카페' },
  { label: '약국', value: '약국' },
  { label: '찜질방', value: '찜질방' },
  { label: '코인노래방', value: '코인노래방' },
  { label: '셀프빨래방', value: '셀프빨래방' },
  { label: '셀프세차장', value: '셀프세차장' },
];

interface Props {
  searchParams: Promise<{ category?: string; city?: string }>;
}

export default async function GuidePage({ searchParams }: Props) {
  const { category, city } = await searchParams;
  const all = getAllPosts();

  const regions = [
    { label: '전체', cities: [] },
    { label: '서울', cities: ['강남구', '마포구', '종로구', '영등포구', '노원구', '강동구', '강북구', '서대문구'] },
    { label: '경기·인천', cities: ['파주', '고양', '의정부', '양주', '동두천', '포천', '수원', '성남', '용인', '부천', '인천'] },
    { label: '부산', cities: ['부산'] },
    { label: '대구', cities: ['대구'] },
    { label: '대전', cities: ['대전'] },
    { label: '광주', cities: ['광주'] },
    { label: '강원', cities: ['강릉', '춘천', '원주'] },
    { label: '경남·경북', cities: ['창원', '포항', '경주', '구미'] },
  ];

  const activeRegion = regions.find(r => r.cities.includes(city || '')) || regions[0];

  const activeRegionCities = regions.find(r => r.cities.includes(city || ''))?.cities ?? [];

  const posts = all.filter(p => {
    const catMatch = !category || category === 'all' || p.category === category;
    const cityMatch = !city || city === 'all' || p.city === city || (p.city != null && activeRegionCities.includes(p.city));
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

      {/* 지역(대분류) 필터 */}
      <div className="guide-filter-bar" style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>
        {regions.map(r => {
          const isActive = r.label === '전체' 
            ? (!city || city === 'all') 
            : r.cities.includes(city || '');
          
          // 리전 선택 시 해당 리전의 첫 번째 도시로 이동하거나 전체로 이동
          const targetCity = r.label === '전체' ? 'all' : r.cities[0];
          
          return (
            <Link
              key={r.label}
              href={`/guide?city=${targetCity}${category && category !== 'all' ? `&category=${category}` : ''}`}
              className={`guide-filter-chip region-chip ${isActive ? 'active' : ''}`}
            >
              {r.label}
            </Link>
          );
        })}
      </div>

      {/* 도시(중분류) 필터 - 선택된 리전에 속한 도시들만 표시 */}
      {activeRegion.label !== '전체' && activeRegion.cities.length > 1 && (
        <div className="guide-filter-bar" style={{ paddingTop: 4 }}>
          {activeRegion.cities.map(c => (
            <Link
              key={c}
              href={`/guide?city=${c}${category && category !== 'all' ? `&category=${category}` : ''}`}
              className={`guide-filter-chip city-chip ${city === c ? 'active' : ''}`}
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
                    {post.category === '카페' ? '☕'
                      : post.category === '편의점' ? '🏪'
                      : post.category === '세차장' || post.category === '셀프세차장' ? '🚗'
                      : post.category === 'PC방' ? '🎮'
                      : post.category === '약국' ? '💊'
                      : post.category === '찜질방' ? '🛁'
                      : post.category === '셀프빨래방' ? '🫧'
                      : post.category === '코인노래방' ? '🎤'
                      : '📍'}
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
