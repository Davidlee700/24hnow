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
  const accentColor = CATEGORY_COLOR[category] ?? '#ADFF2F';

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
          background: '#0A0A0F',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
          }}
        />

        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            padding: '52px 64px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 32,
          }}
        >
          {/* Emoji */}
          <div style={{ fontSize: 88, lineHeight: 1, display: 'flex' }}>{emoji}</div>

          {/* Store name */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              maxWidth: 720,
              display: 'flex',
            }}
          >
            {name}
          </div>

          {/* Region + category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {region && (
              <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                {region}
              </span>
            )}
            {region && (
              <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.25)', display: 'flex' }}>·</span>
            )}
            <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              {category}
            </span>
          </div>

          {/* Open status badge */}
          {open && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(173,255,47,0.14)',
                border: '1px solid rgba(173,255,47,0.4)',
                borderRadius: 100,
                padding: '8px 20px',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ADFF2F',
                  display: 'flex',
                }}
              />
              <span style={{ fontSize: 22, color: '#ADFF2F', fontWeight: 600, display: 'flex' }}>
                지금 영업중
              </span>
            </div>
          )}
        </div>

        {/* Branding footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
            24시
          </span>
          <span style={{ fontSize: 22, color: '#ADFF2F', fontWeight: 700, display: 'flex' }}>
            나우
          </span>
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.2)', display: 'flex' }}>
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
