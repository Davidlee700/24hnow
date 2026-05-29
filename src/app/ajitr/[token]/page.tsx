'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BookmarkItem {
  store_id: string;
  name: string;
  category: string;
  road_address: string;
  latitude: number;
  longitude: number;
}

interface FolderMeta {
  id: string;
  name: string;
  emoji: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  '카페': '#FF9F0A',
  '편의점': '#30D158',
  '셀프세차': '#0A84FF',
};

function getCategoryColor(category: string) {
  for (const [key, color] of Object.entries(CATEGORY_COLORS)) {
    if (category.includes(key)) return color;
  }
  return '#636366';
}

export default function AjitrSharePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const [folder, setFolder] = useState<FolderMeta | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ajitr/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setFolder(data.folder);
        setBookmarks(data.bookmarks);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!folder || bookmarks.length === 0 || !mapRef.current) return;

    const initMap = () => {
      const kakao = (window as any).kakao;
      if (!kakao?.maps) return;

      const center = new kakao.maps.LatLng(bookmarks[0].latitude, bookmarks[0].longitude);
      const map = new kakao.maps.Map(mapRef.current, { center, level: 5 });

      // Fit bounds to all markers
      const bounds = new kakao.maps.LatLngBounds();
      bookmarks.forEach(bm => {
        const pos = new kakao.maps.LatLng(bm.latitude, bm.longitude);
        bounds.extend(pos);

        const color = getCategoryColor(bm.category);
        const content = document.createElement('div');
        content.style.cssText = [
          'display:flex', 'align-items:center', 'justify-content:center',
          `background:${color}`, 'border-radius:50%',
          'width:32px', 'height:32px',
          'border:2.5px solid white',
          'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
          'font-size:14px', 'cursor:pointer',
        ].join(';');
        content.title = bm.name;

        const emojiMap: Record<string, string> = { '카페': '☕', '편의점': '🏪', '셀프세차': '🚿' };
        let emoji = '📍';
        for (const [key, e] of Object.entries(emojiMap)) {
          if (bm.category.includes(key)) { emoji = e; break; }
        }
        content.textContent = emoji;

        new kakao.maps.CustomOverlay({ position: pos, content, yAnchor: 0.5 }).setMap(map);
      });

      if (bookmarks.length > 1) map.setBounds(bounds);
    };

    const kakao = (window as any).kakao;
    if (kakao?.maps) {
      initMap();
    } else {
      window.addEventListener('kakaoMapReady', initMap, { once: true });
    }
  }, [folder, bookmarks]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>⭐</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', padding: '24px', textAlign: 'center', gap: '16px' }}>
        <span style={{ fontSize: '48px' }}>🔒</span>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: 0 }}>비공개 아지트예요</h1>
        <p style={{ fontSize: '14px', color: '#8E8E93', margin: 0, lineHeight: 1.5 }}>
          링크가 만료됐거나 비공개로 전환된 아지트예요.
        </p>
        <Link href="/" style={{ marginTop: '8px', padding: '13px 28px', borderRadius: '14px', background: 'var(--accent-brand)', color: '#ffffff', fontSize: '15px', fontWeight: 700, textDecoration: 'none' }}>
          나만의 아지트 만들기
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#000', color: 'white' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>
            {folder?.emoji} {folder?.name}
          </h1>
          <p style={{ fontSize: '13px', color: '#8E8E93', margin: '3px 0 0' }}>
            아지트 {bookmarks.length}곳
          </p>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: '40vh', maxHeight: '50vh', background: '#1C1C1E' }} />

      {/* Bookmark list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {bookmarks.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#636366', fontSize: '14px', padding: '32px 0' }}>
            아직 저장된 아지트가 없어요
          </p>
        ) : bookmarks.map(bm => (
          <div key={bm.store_id} style={{ padding: '14px 16px', borderRadius: '14px', background: '#1C1C1E', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getCategoryColor(bm.category), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' }}>
              {bm.category.includes('카페') ? '☕' : bm.category.includes('편의점') ? '🏪' : bm.category.includes('세차') ? '🚿' : '📍'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8E8E93', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bm.road_address}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: '16px 20px 36px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Link
          href="/"
          style={{ display: 'block', textAlign: 'center', padding: '15px', borderRadius: '16px', background: 'var(--accent-brand)', color: '#ffffff', fontSize: '15px', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.2px' }}
        >
          나도 아지트 만들기 →
        </Link>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
