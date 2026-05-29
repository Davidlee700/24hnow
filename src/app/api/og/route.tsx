import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const CATEGORY_EMOJI: Record<string, string> = {
  카페: '☕',
  편의점: '🏪',
  셀프세차장: '🚗',
  PC방: '🎮',
  약국: '💊',
  코인노래방: '🎤',
  셀프빨래방: '🫧',
  찜질방: '🛁',
};

const CATEGORY_COLOR: Record<string, string> = {
  카페: '#B07B40',
  편의점: '#0A84FF',
  셀프세차장: '#30D158',
  PC방: '#5856D6',
  약국: '#FF2D55',
  코인노래방: '#FF6B35',
  셀프빨래방: '#32ADE6',
  찜질방: '#FF9F0A',
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const name = searchParams.get('name') ?? '매장';
  const category = searchParams.get('category') ?? '카페';
  const region = searchParams.get('region') ?? '';
  const open = searchParams.get('status') === 'open';

  const emoji = CATEGORY_EMOJI[category] ?? '📍';
  const accentColor = CATEGORY_COLOR[category] ?? 'var(--accent-brand)';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000', // Deep Night Black
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background ambient glow */}
        <div
          style={{
            position: 'absolute',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}25 0%, transparent 60%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* Brand Compass Tagline */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.1)',
            padding: '8px 24px',
            borderRadius: 100,
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)', fontWeight: 500, letterSpacing: '-0.02em', display: 'flex' }}>
            가장 절실한 순간, 확실한 가이드
          </span>
        </div>

        {/* Card Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            padding: '60px 80px',
            background: 'rgba(30, 30, 35, 0.7)',
            border: `1px solid rgba(255, 255, 255, 0.08)`,
            borderRadius: 40,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          {/* Emoji */}
          <div style={{ fontSize: 96, lineHeight: 1, display: 'flex', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.5))' }}>{emoji}</div>

          {/* Store name */}
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              textAlign: 'center',
              maxWidth: 760,
              display: 'flex',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            {name}
          </div>

          {/* Region + category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {region && (
              <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)', fontWeight: 500, display: 'flex' }}>
                {region}
              </span>
            )}
            {region && (
              <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>·</span>
            )}
            <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)', fontWeight: 500, display: 'flex' }}>
              {category}
            </span>
          </div>

          {/* Open status badge */}
          {open && (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(10, 132, 255, 0.15)',
                border: '1.5px solid rgba(10, 132, 255, 0.4)',
                borderRadius: 100,
                padding: '12px 28px',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#0A84FF',
                  display: 'flex',
                  boxShadow: '0 0 12px #0A84FF',
                }}
              />
              <span style={{ fontSize: 26, color: '#0A84FF', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex' }}>
                지금 영업중
              </span>
            </div>
          )}
        </div>

        {/* Branding footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.4)', fontWeight: 600, display: 'flex' }}>
            24시
          </span>
          <span style={{ fontSize: 26, color: '#0A84FF', fontWeight: 800, display: 'flex' }}>
            나우
          </span>
          <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.2)', display: 'flex' }}>
            · 24now.kr
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
