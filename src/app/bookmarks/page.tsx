'use client';

import { useRouter } from 'next/navigation';
import { useBookmarks } from '@/hooks/useBookmarks';
import { supabase } from '@/lib/supabase';

const CATEGORY_EMOJI: Record<string, string> = {
  '카페': '☕',
  '편의점': '🏪',
  '셀프세차장': '🚗',
  'PC방': '🎮',
  '약국': '💊',
};

export default function BookmarksPage() {
  const router = useRouter();
  const { bookmarks, toggleBookmark, user, loading } = useBookmarks();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleRemove = async (storeId: string, name: string, category: string, road_address: string, latitude: number, longitude: number) => {
    await toggleBookmark({ id: storeId, name, category, road_address, latitude, longitude });
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '56px 20px 16px',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={() => router.back()}
          aria-label="뒤로가기"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path d="M8 2L2 8L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>내 아지트</h1>
          {user && bookmarks.length > 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              {bookmarks.length}개 저장됨
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '480px', margin: '0 auto' }}>
        {/* 비로그인 상태 */}
        {!user ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '48px' }}>🔒</span>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 6px' }}>로그인이 필요해요</p>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>
                저장한 아지트를 확인하려면<br/>카카오 로그인이 필요해요
              </p>
            </div>
            <button
              onClick={handleLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#FEE500',
                color: '#000',
                border: 'none',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.37 6.04-.19.643-.69 2.338-.79 2.697-.13.483.17.478.36.35.15-.1.2.14 2.89-1.883.71.1 1.45.15 2.16.15 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
              </svg>
              카카오로 로그인
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>불러오는 중...</div>
          </div>
        ) : bookmarks.length === 0 ? (
          /* 빈 상태 */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '48px' }}>🤍</span>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 6px' }}>저장한 아지트가 없어요</p>
              <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>
                지도에서 마음에 드는 장소를<br/>하트로 저장해보세요
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'var(--accent-neon)',
                color: '#000',
                border: 'none',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              지도로 돌아가기
            </button>
          </div>
        ) : (
          /* 북마크 목록 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookmarks.map(b => (
              <div
                key={b.store_id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => router.push(`/?store=${b.store_id}`)}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}>
                  {CATEGORY_EMOJI[b.category] ?? '📍'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.road_address}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleRemove(b.store_id, b.name, b.category, b.road_address, b.latitude, b.longitude);
                  }}
                  aria-label="저장 취소"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px',
                    flexShrink: 0,
                  }}
                >
                  🧡
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
