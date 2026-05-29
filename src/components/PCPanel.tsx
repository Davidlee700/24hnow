'use client';

import { useRef } from 'react';
import type { Store } from '@/types/store';
import { getOpenStatus } from '@/utils/openHours';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';

const CATEGORY_EMOJI: Record<string, string> = {
  카페: '☕', 편의점: '🏪', 셀프세차장: '🚗', PC방: '🎮',
  약국: '💊', 코인노래방: '🎤', 셀프빨래방: '🫧', 찜질방: '🛁',
  복권판매점: '🎰',
};

function tapEffect(el: HTMLElement) {
  el.classList.remove('tap-bounce');
  void el.offsetWidth;
  el.classList.add('tap-bounce');
  el.addEventListener('animationend', () => el.classList.remove('tap-bounce'), { once: true });
}

interface PCPanelProps {
  stores: Store[];
  selectedStore: Store | null;
  activeFilter: string;
  activeTag: string | null;
  openNowOnly: boolean;
  userLocation: { lat: number; lng: number } | null;
  onSelectFilter: (filter: string, e: React.MouseEvent<HTMLElement>) => void;
  onToggleTag: (tag: string, e: React.MouseEvent<HTMLElement>) => void;
  onToggleOpenNow: (e: React.MouseEvent<HTMLElement>) => void;
  onSelectStore: (store: Store | null) => void;
  onMenuOpen: () => void;
}

const FILTERS = ['카페', '약국', '찜질방', '셀프빨래방', '셀프세차장', '복권판매점', 'PC방', '편의점', '코인노래방'];

function StoreStatusBadge({ store }: { store: Store }) {
  const now = new Date();
  const status = store.operation_type === '24H' ? null : getOpenStatus(store, now);
  const isOpen = store.operation_type === '24H' || status?.isOpen === true;
  const isUnknown = status?.isOpen === null;

  if (store.operation_type === '24H') {
    return <span className="pc-store-card-badge open">24H</span>;
  }
  if (isOpen) {
    return <span className="pc-store-card-badge open">영업중</span>;
  }
  if (isUnknown) {
    return <span className="pc-store-card-badge unknown">미확인</span>;
  }
  return <span className="pc-store-card-badge closed">영업종료</span>;
}

function PCStoreCard({ store, selected, onClick }: { store: Store; selected: boolean; onClick: () => void }) {
  const emoji = CATEGORY_EMOJI[store.category] ?? '📍';
  const address = store.road_address || '주소 정보 없음';
  const shortAddr = address.split(' ').slice(1, 4).join(' ');

  return (
    <div className={`pc-store-card${selected ? ' selected' : ''}`} onClick={onClick}>
      <div className="pc-store-card-emoji">{emoji}</div>
      <div className="pc-store-card-info">
        <div className="pc-store-card-name">{store.name}</div>
        <div className="pc-store-card-address">{shortAddr}</div>
      </div>
      <StoreStatusBadge store={store} />
    </div>
  );
}

function PCStoreDetail({ store, userLocation, onBack }: { store: Store; userLocation: { lat: number; lng: number } | null; onBack: () => void }) {
  const now = new Date();
  const status = store.operation_type === '24H' ? null : getOpenStatus(store, now);
  const isOpen = store.operation_type === '24H' || status?.isOpen === true;
  const isUnknown = status?.isOpen === null;
  const emoji = CATEGORY_EMOJI[store.category] ?? '📍';

  const statusLabel = store.operation_type === '24H'
    ? '24시간 영업'
    : status?.label ?? '영업시간 미확인';

  const statusColor = store.operation_type === '24H' || isOpen
    ? '#34C759'
    : isUnknown
    ? '#FF9F0A'
    : 'var(--text-tertiary)';

  const kakaoDirectionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;

  return (
    <>
      <button className="pc-back-btn" onClick={onBack}>‹ 목록으로</button>
      <div className="pc-detail-body">
        <p className="pc-detail-name">{store.name}</p>
        <div className="pc-detail-meta">
          <span>{emoji} {store.category}</span>
          <span style={{ color: statusColor, fontWeight: 600 }}>· {statusLabel}</span>
        </div>

        <div className="pc-detail-actions">
          {store.metadata?.phone && (
            <a href={`tel:${store.metadata?.phone}`} className="pc-action-btn secondary">
              📞 전화
            </a>
          )}
          <a
            href={kakaoDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pc-action-btn primary"
          >
            🗺️ 길찾기
          </a>
        </div>

        {store.road_address && (
          <div className="pc-detail-info-row">
            <span className="pc-detail-info-icon">📍</span>
            <span>{store.road_address}</span>
          </div>
        )}

        {store.metadata?.phone && (
          <div className="pc-detail-info-row">
            <span className="pc-detail-info-icon">📞</span>
            <span>{store.metadata?.phone}</span>
          </div>
        )}

        <div className="pc-detail-info-row">
          <span className="pc-detail-info-icon">🕐</span>
          <span style={{ color: statusColor }}>{statusLabel}</span>
        </div>

        {store.operation_type !== '24H' && status?.isOpen === null && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,159,10,0.08)', border: '0.5px solid rgba(255,159,10,0.2)', fontSize: 12, color: '#FF9F0A', lineHeight: 1.5 }}>
            ⚠️ 영업시간 정보가 확인되지 않았어요. 방문 전 전화 확인을 권장합니다.
          </div>
        )}

        <a
          href={`/stores/${store.id}`}
          style={{ display: 'block', marginTop: 20, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'background 0.15s' }}
        >
          리뷰 · 상세 정보 보기
        </a>
      </div>
    </>
  );
}

export default function PCPanel({
  stores,
  selectedStore,
  activeFilter,
  activeTag,
  openNowOnly,
  userLocation,
  onSelectFilter,
  onToggleTag,
  onToggleOpenNow,
  onSelectStore,
  onMenuOpen,
}: PCPanelProps) {
  const categoryTags = CATEGORY_TAGS[activeFilter] ?? [];

  return (
    <aside className="pc-panel">
      {/* Header */}
      <div className="pc-panel-header">
        <a href="/" style={{ textDecoration: 'none', color: 'inherit', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
          24시<span style={{ color: 'var(--accent-neon)' }}>나우</span>
        </a>
        <button
          className="nav-menu-btn"
          onClick={onMenuOpen}
          aria-label="메뉴 열기"
          style={{ padding: '8px' }}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
            <rect x="0" y="0" width="18" height="1.6" rx="0.8"/>
            <rect x="0" y="6.2" width="18" height="1.6" rx="0.8"/>
            <rect x="0" y="12.4" width="18" height="1.6" rx="0.8"/>
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="pc-filter-section">
        <div className="pc-category-grid">
          {FILTERS.map(filter => (
            <button
              key={filter}
              className={`filter-chip${activeFilter === filter ? ' active' : ''}`}
              onClick={(e) => onSelectFilter(filter, e)}
              style={{ fontSize: 12, padding: '5px 10px' }}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="pc-subfilter-row">
          <button
            className={`sub-filter-chip open-now-chip${openNowOnly ? ' active' : ''}`}
            onClick={(e) => onToggleOpenNow(e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              borderColor: openNowOnly ? 'var(--accent-neon)' : undefined,
              color: openNowOnly ? 'var(--accent-neon)' : undefined,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: openNowOnly ? 'var(--accent-neon)' : 'currentColor', display: 'inline-block', flexShrink: 0 }} />
            영업중{openNowOnly && stores.length > 0 ? ` ${stores.length}` : ''}
          </button>
          {categoryTags.map(tag => (
            <button
              key={tag}
              className={`sub-filter-chip${activeTag === tag ? ' active' : ''}`}
              onClick={(e) => onToggleTag(tag, e)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pc-panel-content">
        {selectedStore ? (
          <PCStoreDetail store={selectedStore} userLocation={userLocation} onBack={() => onSelectStore(null)} />
        ) : (
          <>
            {stores.length > 0 && (
              <p className="pc-list-meta">{activeFilter} {stores.length}개</p>
            )}
            {stores.length === 0 ? (
              <div className="pc-empty-state">
                <p style={{ marginBottom: 8, fontSize: 16 }}>🗺️</p>
                <p>지도를 이동하거나<br />확대해보세요</p>
              </div>
            ) : (
              stores.map(store => (
                <PCStoreCard
                  key={store.id}
                  store={store}
                  selected={false}
                  onClick={() => onSelectStore(store)}
                />
              ))
            )}
          </>
        )}
      </div>
    </aside>
  );
}
