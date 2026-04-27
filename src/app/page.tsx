'use client';

import { useState, useRef, useCallback } from 'react';
import KakaoMap from '@/components/KakaoMap';
import StoreBottomSheet from '@/components/StoreBottomSheet';
import { useStores } from '@/hooks/useStores';
import type { Store, MapBounds } from '@/types/store';

const FILTERS = ['카페', '편의점', '셀프세차장'];

function tapEffect(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove('tap-bounce');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('tap-bounce');
  el.addEventListener('animationend', () => el.classList.remove('tap-bounce'), { once: true });
}

export default function Home() {
  const [activeFilters, setActiveFilters] = useState<string[]>(['카페']);
  const [cafeSubFilter, setCafeSubFilter] = useState<'all' | 'unmanned_only'>('all');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [requestGps, setRequestGps] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // "이 지역에서 검색" logic
  const pendingBoundsRef = useRef<MapBounds | null>(null);
  const isFirstBoundsRef = useRef(true);
  const [searchedBounds, setSearchedBounds] = useState<MapBounds | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [searchHideAnim, setSearchHideAnim] = useState(false);

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    pendingBoundsRef.current = bounds;
    if (isFirstBoundsRef.current) {
      isFirstBoundsRef.current = false;
      setSearchedBounds(bounds);
    } else {
      setShowSearchHere(true);
      setSearchHideAnim(false);
    }
  }, []);

  const handleSearchHere = (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setSearchHideAnim(true);
    setTimeout(() => {
      setShowSearchHere(false);
      setSearchHideAnim(false);
      if (pendingBoundsRef.current) setSearchedBounds(pendingBoundsRef.current);
    }, 180);
  };

  const { stores: rawStores } = useStores(searchedBounds, activeFilters);

  // Client-side 무인카페 sub-filter
  const stores = cafeSubFilter === 'unmanned_only'
    ? rawStores.filter(s => {
        if (s.category !== '카페') return true;
        return s.name.includes('무인') || s.metadata?.kakao_category_full?.includes('무인');
      })
    : rawStores;

  const toggleFilter = (filter: string, e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.length > 1 ? prev.filter(f => f !== filter) : prev;
      }
      return [...prev, filter];
    });
    setSelectedStore(null);
  };

  const showCafeSubFilter = activeFilters.includes('카페');

  return (
    <>
      <KakaoMap
        stores={stores}
        onBoundsChange={handleBoundsChange}
        onMarkerClick={setSelectedStore}
        requestGps={requestGps}
        onGpsComplete={() => setRequestGps(false)}
        onLocationUpdate={(lat, lng) => setUserLocation({ lat, lng })}
      />

      {/* Top bar */}
      <div className="floating-top">
        <div className="floating-search-bar">
          <div className="brand-title">24시 <span style={{ color: 'var(--accent-neon)' }}>나우</span></div>
        </div>

        {/* 1차 필터 */}
        <div className="filter-container">
          {FILTERS.map(filter => (
            <div
              key={filter}
              className={`filter-chip ${activeFilters.includes(filter) ? 'active' : ''}`}
              onClick={(e) => toggleFilter(filter, e)}
            >
              {filter}
            </div>
          ))}
        </div>

        {/* 2차 필터: 카페 선택 시 무인카페 */}
        {showCafeSubFilter && (
          <div className="sub-filter-container">
            <button
              className={`sub-filter-chip ${cafeSubFilter === 'all' ? 'active' : ''}`}
              onClick={(e) => { tapEffect(e); setCafeSubFilter('all'); }}
            >
              전체
            </button>
            <button
              className={`sub-filter-chip ${cafeSubFilter === 'unmanned_only' ? 'active' : ''}`}
              onClick={(e) => { tapEffect(e); setCafeSubFilter('unmanned_only'); }}
            >
              무인카페만
            </button>
          </div>
        )}

        {/* 이 지역에서 검색 버튼 */}
        {showSearchHere && (
          <button
            className={`search-here-btn ${searchHideAnim ? 'hiding' : ''}`}
            onClick={handleSearchHere}
          >
            여기서 찾기 🔍
          </button>
        )}
      </div>

      {/* Empty State */}
      {searchedBounds && stores.length === 0 && !showSearchHere && (
        <div className="empty-state">
          <p>이 근처엔 24시간 운영 매장이 없어요</p>
          <span>지도를 이동해 다른 지역을 확인해보세요</span>
        </div>
      )}

      {/* GPS button */}
      <div
        className={`gps-button ${requestGps ? 'active' : ''}`}
        onClick={(e) => { tapEffect(e); setRequestGps(true); }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <StoreBottomSheet
        store={selectedStore}
        userLocation={userLocation}
        onClose={() => setSelectedStore(null)}
      />
    </>
  );
}
