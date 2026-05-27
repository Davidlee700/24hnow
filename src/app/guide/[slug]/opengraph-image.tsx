import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/lib/guide-data';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CATEGORY_COLORS: Record<string, { from: string; to: string; accent: string }> = {
  '카페':       { from: '#0d0d1a', to: '#0f2a50', accent: '#adff2f' },
  '찜질방':     { from: '#1a0e00', to: '#5a2800', accent: '#ffb347' },
  '셀프빨래방': { from: '#001a2e', to: '#00436b', accent: '#5ec8f0' },
  '약국':       { from: '#1a0020', to: '#5a0040', accent: '#ff70c8' },
  '코인노래방': { from: '#1a0a00', to: '#6a2800', accent: '#ffda6a' },
  '셀프세차장': { from: '#0d1b2a', to: '#005a8e', accent: '#5ec8f0' },
  '세차장':     { from: '#0d1b2a', to: '#005a8e', accent: '#5ec8f0' },
  'PC방':       { from: '#111',    to: '#2a2a2a', accent: '#7b61ff' },
};

async function loadFont(): Promise<ArrayBuffer | undefined> {
  try {
    return await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.2/files/noto-sans-kr-korean-700-normal.woff2'
    ).then(r => r.arrayBuffer());
  } catch {
    return undefined;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return new Response('Not found', { status: 404 });

  const colors = CATEGORY_COLORS[post.category] ?? { from: '#111', to: '#222', accent: '#adff2f' };
  const fontData = await loadFont();

  const title = post.title.length > 30 ? post.title.slice(0, 28) + '…' : post.title;
  const desc  = post.description.length > 60 ? post.description.slice(0, 58) + '…' : post.description;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: `linear-gradient(145deg, ${colors.from} 0%, ${colors.to} 100%)`,
          color: '#fff',
          fontFamily: fontData ? 'NotoSansKR' : 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 상단 브랜딩 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: colors.accent }}>24시나우</span>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)' }}>· 심야 가이드</span>
        </div>

        {/* 메인 콘텐츠 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 카테고리·지역 배지 */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 700,
                padding: '6px 18px',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.12)',
                border: `1px solid ${colors.accent}55`,
                color: colors.accent,
                letterSpacing: '-0.01em',
              }}
            >
              {post.category}
            </span>
            <span
              style={{
                fontSize: '18px',
                padding: '6px 18px',
                borderRadius: '100px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              {post.region}
            </span>
          </div>

          {/* 제목 */}
          <div
            style={{
              fontSize: title.length > 22 ? '46px' : '54px',
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.025em',
              color: '#fff',
            }}
          >
            {title}
          </div>

          {/* 설명 */}
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.55,
              letterSpacing: '-0.01em',
            }}
          >
            {desc}
          </div>
        </div>

        {/* 하단 메타 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)' }}>
            새벽에도 찾을 수 있는 공간 · 24now.kr
          </span>
          <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)' }}>{post.date}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: 'NotoSansKR', data: fontData, weight: 700, style: 'normal' }]
        : [],
    }
  );
}
