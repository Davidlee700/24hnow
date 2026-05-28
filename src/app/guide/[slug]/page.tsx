import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllPosts, getPostBySlug, getRelatedPosts, CATEGORY_GRADIENTS } from '@/lib/guide-data';
import AdBanner from '@/components/AdBanner';
import ShareButtons from '@/components/ShareButtons';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const seoTitle = post.dong
    ? `${post.city} ${post.dong} 24시간 ${post.category} 추천 BEST ${post.stores.length} | 24시나우`
    : `${post.title} | 심야 가이드 · 24시나우`;

  const seoDesc = post.dong
    ? `${post.city} ${post.dong}에서 새벽에도 문 여는 ${post.category} ${post.stores.length}곳. 영업시간·주소·분위기를 직접 선별했습니다.`
    : post.description;

  return {
    title: seoTitle,
    description: seoDesc,
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      url: `https://24now.kr/guide/${post.slug}`,
      type: 'article',
    },
    alternates: { canonical: `https://24now.kr/guide/${post.slug}` },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: seoDesc,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post);

  const isoDate = post.date ? post.date.replace(/\./g, '-') : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: ['https://24now.kr/og-image.png'],
    datePublished: isoDate,
    dateModified: isoDate,
    author: {
      '@type': 'Person',
      name: '24시나우 에디터',
    },
    publisher: {
      '@type': 'Organization',
      name: '24시나우',
      url: 'https://24now.kr',
      logo: {
        '@type': 'ImageObject',
        url: 'https://24now.kr/icon.png',
      }
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://24now.kr/guide/${post.slug}` },
  };

  const faqJsonLd = post.faq && post.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      }
    : null;

  return (
    <div className="guide-article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* 고정 상단 네비 */}
      <header className="guide-article-header">
        <Link href="/guide" className="guide-header-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>목록</span>
        </Link>
        <Link href="/" className="guide-map-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <span>지도 보기</span>
        </Link>
      </header>

      {/* 히어로 */}
      <div
        className="guide-article-hero"
        style={{ background: post.gradient || CATEGORY_GRADIENTS[post.category] }}
      >
        <div className="guide-article-hero-inner">
          <div className="guide-article-tags">
            <span className="guide-tag">{post.category}</span>
            <span className="guide-tag">{post.region}</span>
          </div>
          <h1 className="guide-article-title">{post.title}</h1>
          <div className="guide-article-meta">
            <span>{post.date}</span>
            <span className="guide-meta-dot">·</span>
            <span>읽는 데 {post.readTime}분</span>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <article className="guide-article-body">
        {/* 인트로 */}
        <p className="guide-article-intro">{post.intro}</p>

        <AdBanner dataAdSlot="3810117607" />

        {/* TOP 10 스토어 카드 */}
        <div className="guide-store-list">
          {post.stores.map(store => (
            <div key={store.rank} className="guide-store-card">
              <div className="guide-store-rank">
                <span>{store.rank}</span>
              </div>
              <div className="guide-store-info">
                <div className="guide-store-value-tag">{store.valueTag}</div>
                <div className="guide-store-name">{store.name}</div>
                <div className="guide-store-address">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {store.address}
                </div>
                {store.transit && (
                  <div className="guide-store-transit">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                      <path d="M8 6h8M8 10h8" />
                    </svg>
                    {store.transit}
                  </div>
                )}
                <div className="guide-store-hours">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {store.hours}
                </div>
                <p className="guide-store-desc">{store.description}</p>
                {store.insight && (
                  <p className="guide-store-insight">"{store.insight}"</p>
                )}
                {store.tags && store.tags.length > 0 && (
                  <div className="guide-store-tags">
                    {store.tags.map(tag => (
                      <span key={tag} className="guide-store-tag">{tag}</span>
                    ))}
                  </div>
                )}
                {store.mapLink && (
                  <a href={store.mapLink} className="guide-store-map-link">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                    24시나우에서 위치 확인
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <AdBanner dataAdSlot="3810117607" />

        {/* 아웃트로 */}
        {post.outro && (
          <p className="guide-article-outro">{post.outro}</p>
        )}

        {/* 상황별 추천 */}
        {post.situationTip && (
          <div className="guide-situation-tip">
            <h2 className="guide-situation-title">어떤 상황인가요?</h2>
            <p className="guide-situation-body">{post.situationTip}</p>
          </div>
        )}

        {/* FAQ */}
        {post.faq && post.faq.length > 0 && (
          <section className="guide-faq">
            <h2 className="guide-faq-title">자주 묻는 질문</h2>
            <dl className="guide-faq-list">
              {post.faq.map(({ q, a }, i) => (
                <div key={i} className="guide-faq-item">
                  <dt className="guide-faq-q">{q}</dt>
                  <dd className="guide-faq-a">{a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* 공유 버튼 */}
        <ShareButtons
          title={post.title}
          description={post.description}
          url={`https://24now.kr/guide/${post.slug}`}
          imageUrl={`https://24now.kr/guide/${post.slug}/opengraph-image`}
        />

        {/* 지도 CTA */}
        <Link href="/" className="guide-map-cta">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          지금 지도에서 찾기
        </Link>

        {/* 관련 게시글 */}
        {related.length > 0 && (
          <section className="guide-related">
            <h2 className="guide-related-title">더 읽어보기</h2>
            <div className="guide-related-list">
              {related.map(rp => (
                <Link key={rp.slug} href={`/guide/${rp.slug}`} className="guide-related-card">
                  <div
                    className="guide-related-thumb"
                    style={{ background: rp.gradient || CATEGORY_GRADIENTS[rp.category] }}
                  >
                    <span>
                      {rp.category === '카페' ? '☕'
                        : rp.category === '편의점' ? '🏪'
                        : rp.category === '세차장' || rp.category === '셀프세차장' ? '🚗'
                        : rp.category === 'PC방' ? '🎮'
                        : rp.category === '약국' ? '💊'
                        : rp.category === '찜질방' ? '🛁'
                        : rp.category === '셀프빨래방' ? '🫧'
                        : rp.category === '코인노래방' ? '🎤'
                        : rp.category === '복권판매점' ? '🎰'
                        : '📍'}
                    </span>
                  </div>
                  <div className="guide-related-info">
                    <p className="guide-related-name">{rp.title}</p>
                    <p className="guide-related-meta">{rp.region} · {rp.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
