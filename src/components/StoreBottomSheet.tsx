'use client';

import type { Store } from '@/types/store';

interface Props {
  store: Store | null;
  reportedStores: Set<string>;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onReport: (storeId: string, report: 'open' | 'closed') => void;
}

function relativeTime(isoString: string): string {
  const days = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
  if (days === 0) return '오늘 확인됨';
  if (days === 1) return '1일 전 확인됨';
  return `${days}일 전 확인됨`;
}

export default function StoreBottomSheet({ store, reportedStores, userLocation, onClose, onReport }: Props) {
  const openDirections = () => {
    if (!store) return;
    const dest = `${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;
    const url = userLocation
      ? `https://map.kakao.com/link/from/현재위치,${userLocation.lat},${userLocation.lng}/to/${dest}`
      : `https://map.kakao.com/link/to/${dest}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`bottom-sheet ${store ? 'open' : ''}`}>
      <div className="drag-handle" onClick={onClose}></div>

      {store && (
        <div className="sheet-content">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
              <h2 className="title-1" style={{ marginBottom: '4px' }}>{store.name}</h2>
              <p className="caption">{store.category} · {store.road_address}</p>
            </div>
            <span className={`badge ${store.trust_score > 60 ? 'badge-verified' : 'badge-warning'}`}>
              {store.trust_score > 60 ? '● 운영 중' : '확인 필요'}
            </span>
          </div>

          {/* Info chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '10px 0' }}>
            <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              신뢰도 {store.trust_score}점
            </span>
            {store.last_verified_at && (
              <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                {relativeTime(store.last_verified_at)}
              </span>
            )}
            {store.metadata?.kakao_category_full && (
              <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                {store.metadata.kakao_category_full}
              </span>
            )}
          </div>

          {/* Phone */}
          {store.metadata?.phone && (
            <a
              href={`tel:${store.metadata.phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', color: 'var(--accent-blue, #0a84ff)', fontSize: '15px', textDecoration: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {store.metadata.phone}
            </a>
          )}

          {/* Map links */}
          <div style={{ display: 'flex', gap: '8px', margin: '4px 0 12px' }}>
            {store.metadata?.place_url && (
              <a href={store.metadata.place_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                카카오맵 보기 →
              </a>
            )}
            {store.metadata?.naver_place_url && (
              <a href={store.metadata.naver_place_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                네이버지도 보기 →
              </a>
            )}
          </div>

          {/* Report buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>정보 신고:</span>
            <button
              onClick={() => onReport(store.id, 'open')}
              disabled={reportedStores.has(store.id)}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #30D158', background: 'transparent', color: '#30D158', cursor: reportedStores.has(store.id) ? 'default' : 'pointer', opacity: reportedStores.has(store.id) ? 0.4 : 1 }}
            >
              ✓ 운영중
            </button>
            <button
              onClick={() => onReport(store.id, 'closed')}
              disabled={reportedStores.has(store.id)}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #FF453A', background: 'transparent', color: '#FF453A', cursor: reportedStores.has(store.id) ? 'default' : 'pointer', opacity: reportedStores.has(store.id) ? 0.4 : 1 }}
            >
              ✕ 폐업
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="ios-button primary" onClick={onClose}>닫기</button>
            <button className="ios-button" onClick={openDirections}>길찾기</button>
          </div>
        </div>
      )}
    </div>
  );
}
