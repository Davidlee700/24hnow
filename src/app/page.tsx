'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import KakaoMap from '@/components/KakaoMap';
import StoreBottomSheet from '@/components/StoreBottomSheet';
import { useStores } from '@/hooks/useStores';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';
import type { Store, MapBounds } from '@/types/store';
import { supabase } from '@/lib/supabase';

const FILTERS = ['카페', '편의점', '셀프세차장', 'PC방', '약국'];

function tapEffect(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove('tap-bounce');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('tap-bounce');
  el.addEventListener('animationend', () => el.classList.remove('tap-bounce'), { once: true });
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<string>('카페');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [requestGps, setRequestGps] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Handle deep linking from URL (?store=uuid)
  useEffect(() => {
    const storeId = searchParams.get('store');
    if (storeId) {
      supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedStore(data as Store);
            setMapCenter({ lat: data.latitude, lng: data.longitude });
          }
        });
    }
  }, [searchParams]);

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

  const { stores: fetchedStores } = useStores(searchedBounds, [activeFilter], activeTag ?? undefined);

  // Ensure the selectedStore is ALWAYS in the markers list, even if filtered out or outside bounds
  const stores = [...fetchedStores];
  if (selectedStore && !stores.some(s => s.id === selectedStore.id)) {
    stores.push(selectedStore);
  }

  const selectFilter = (filter: string, e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setActiveFilter(filter);
    setActiveTag(null);
    setSelectedStore(null);
  };

  const toggleTag = (tag: string, e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setActiveTag(prev => prev === tag ? null : tag);
    setSelectedStore(null);
  };

  const categoryTags = CATEGORY_TAGS[activeFilter] ?? [];

  return (
    <>
      <KakaoMap
        stores={stores}
        center={mapCenter}
        onBoundsChange={handleBoundsChange}
        onMarkerClick={setSelectedStore}
        onMapClick={() => setSelectedStore(null)}
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
              className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
              onClick={(e) => selectFilter(filter, e)}
            >
              {filter}
            </div>
          ))}
        </div>

        {/* 2차 필터: 카테고리 태그 */}
        {categoryTags.length > 0 && (
          <div className="sub-filter-container">
            {categoryTags.map(tag => (
              <button
                key={tag}
                className={`sub-filter-chip ${activeTag === tag ? 'active' : ''}`}
                onClick={(e) => toggleTag(tag, e)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 이 지역에서 검색 버튼 (하단 레이어) */}
      {showSearchHere && !selectedStore && (
        <div className={`search-here-wrapper ${searchHideAnim ? 'hiding' : ''}`}>
          <button
            className="search-here-btn"
            onClick={handleSearchHere}
          >
            여기서 찾기 🔍
          </button>
          <p className="search-hint">원하는 위치로 지도를 이동한 뒤 탭해보세요</p>
        </div>
      )}

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

export default function Home() {
  return (
    <Suspense fallback={<div className="loading-overlay">지도를 불러오고 있어요...</div>}>
      <HomeContent />
    </Suspense>
  );
}
