'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import KakaoMap from '@/components/KakaoMap';
import StoreBottomSheet from '@/components/StoreBottomSheet';
import MenuDrawer from '@/components/MenuDrawer';
import NightBanner from '@/components/NightBanner';
import RecentStores from '@/components/RecentStores';
import { useStores } from '@/hooks/useStores';
import { useHistory } from '@/hooks/useHistory';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';
import type { Store, MapBounds } from '@/types/store';
import { supabase } from '@/lib/supabase';

const FILTERS = ['카페', '편의점', 'PC방', '셀프세차장', '코인노래방', '셀프빨래방', '약국'];

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
  const [openNowOnly, setOpenNowOnly] = useState(true);
  const [medicineOnly, setMedicineOnly] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [requestGps, setRequestGps] = useState(() => !searchParams.get('store'));
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { history: recentHistory, addToHistory } = useHistory();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle deep linking from URL (?store=uuid)
  useEffect(() => {
    const storeId = searchParams.get('store');
    if (!storeId) return;

    (async () => {
      try {
        const { data } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();
        if (data) {
          handleSelectStore(data as Store);
          setMapCenter({ lat: data.latitude, lng: data.longitude });
        }
      } catch {
        showToast('링크의 매장 정보를 불러오지 못했어요.');
      }
    })();
  }, [searchParams]);

  // "이 지역에서 검색" logic
  const pendingBoundsRef = useRef<MapBounds | null>(null);
  const autoSearchOnNextBounds = useRef(false);
  const [searchedBounds, setSearchedBounds] = useState<MapBounds | null>(null);
  const [showSearchHere, setShowSearchHere] = useState(false);
  const [searchHideAnim, setSearchHideAnim] = useState(false);
  const [showZoomHint, setShowZoomHint] = useState(false);

  const handleBoundsChange = useCallback((bounds: MapBounds | null) => {
    if (!bounds) {
      setShowSearchHere(false);
      setShowZoomHint(true);
      return;
    }
    setShowZoomHint(false);
    pendingBoundsRef.current = bounds;

    // GPS 완료 후 첫 bounds 업데이트는 자동 검색
    if (autoSearchOnNextBounds.current) {
      autoSearchOnNextBounds.current = false;
      setSearchedBounds(bounds);
      setShowSearchHere(false);
      return;
    }

    setShowSearchHere(true);
    setSearchHideAnim(false);
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

  const { stores: fetchedStores } = useStores(searchedBounds, [activeFilter], activeTag ?? undefined, openNowOnly, medicineOnly);

  // 매장 선택 시 최근 방문 기록에 추가
  const handleSelectStore = (store: Store | null) => {
    setSelectedStore(store);
    if (store) addToHistory({ id: store.id, name: store.name, category: store.category });
  };

  // Ensure the selectedStore is ALWAYS in the markers list, even if filtered out or outside bounds
  const stores = [...fetchedStores];
  if (selectedStore && !stores.some(s => s.id === selectedStore.id)) {
    stores.push(selectedStore);
  }

  const selectFilter = (filter: string, e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setActiveFilter(filter);
    setActiveTag(null);
    setMedicineOnly(false);
    setSelectedStore(null);
    if (pendingBoundsRef.current) {
      setSearchedBounds(pendingBoundsRef.current);
      setShowSearchHere(false);
    }
  };

  const toggleTag = (tag: string, e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setActiveTag(prev => prev === tag ? null : tag);
    setSelectedStore(null);
    if (pendingBoundsRef.current) {
      setSearchedBounds(pendingBoundsRef.current);
      setShowSearchHere(false);
    }
  };

  const categoryTags = CATEGORY_TAGS[activeFilter] ?? [];

  return (
    <>
      <KakaoMap
        stores={stores}
        center={mapCenter}
        onBoundsChange={handleBoundsChange}
        onMarkerClick={handleSelectStore}
        onMapClick={() => setSelectedStore(null)}
        requestGps={requestGps}
        onGpsComplete={() => {
          setRequestGps(false);
          autoSearchOnNextBounds.current = true;
        }}
        onGpsError={showToast}
        onLocationUpdate={(lat, lng) => setUserLocation({ lat, lng })}
        dimmed={isMenuOpen}
      />

      <NightBanner />

      <h1 style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
        24시간 카페·편의점·세차장 찾기 — 새벽에도 문 여는 곳, 24시나우
      </h1>

      {/* Top bar */}
      <div className="floating-top">
        {/* 통합 네비게이션 바: 브랜드 | 카테고리 스크롤 | 메뉴 */}
        <div className="floating-search-bar">
          <a href="/" className="brand-title" style={{ textDecoration: 'none', color: 'inherit' }}>24시<span style={{ color: 'var(--accent-neon)' }}>나우</span></a>
          <div className="nav-divider" />
          <div className="nav-categories">
            {FILTERS.map(filter => (
              <button
                key={filter}
                className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
                onClick={(e) => selectFilter(filter, e)}
              >
                {filter}
              </button>
            ))}
          </div>
          <button
            className="nav-menu-btn"
            onClick={() => setIsMenuOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={isMenuOpen}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
              <rect x="0" y="0" width="18" height="1.6" rx="0.8"/>
              <rect x="0" y="6.2" width="18" height="1.6" rx="0.8"/>
              <rect x="0" y="12.4" width="18" height="1.6" rx="0.8"/>
            </svg>
          </button>
        </div>

        {/* 2차 필터 */}
        <div className="sub-filter-container">
          {/* 지금 영업중 토글 — 항상 최상단 좌측 */}
          <button
            className={`sub-filter-chip open-now-chip ${openNowOnly ? 'active' : ''}`}
            onClick={(e) => { tapEffect(e); setOpenNowOnly(v => !v); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              borderColor: openNowOnly ? 'var(--accent-neon)' : undefined,
              color: openNowOnly ? 'var(--accent-neon)' : undefined,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: openNowOnly ? 'var(--accent-neon)' : 'currentColor', display: 'inline-block', flexShrink: 0 }} />
            영업중{openNowOnly && fetchedStores.length > 0 ? ` ${fetchedStores.length}` : ''}
          </button>
          {activeFilter === '편의점' && (
            <button
              className={`sub-filter-chip ${medicineOnly ? 'active' : ''}`}
              onClick={(e) => { tapEffect(e); setMedicineOnly(v => !v); }}
              style={medicineOnly ? { borderColor: '#30D158', color: '#30D158' } : undefined}
            >
              💊 약 판매
            </button>
          )}
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
      </div>

      {/* 줌아웃 안내 */}
      {showZoomHint && !selectedStore && (
        <div className="zoom-hint-banner">
          <span style={{ fontSize: '20px' }}>🗺️</span>
          <div>
            <p>지도를 좀 더 확대해보세요</p>
            <span>확대하면 주변 24시간 매장을 찾을 수 있어요</span>
          </div>
        </div>
      )}

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
          <p>{openNowOnly ? `지금 이 근처에 영업 중인 ${activeFilter}이(가) 없어요` : `이 근처엔 ${activeFilter} 정보가 없어요`}</p>
          <span>{openNowOnly ? '지도를 이동하거나 "지금 영업중" 필터를 해제해보세요' : '지도를 이동해 다른 지역을 확인해보세요'}</span>
        </div>
      )}

      {/* 최근 방문 기록 — 선택된 매장 없고, 이동 버튼도 없을 때만 노출 */}
      {!selectedStore && !showSearchHere && (
        <RecentStores items={recentHistory} />
      )}

      {/* GPS button */}
      <div
        className={`gps-button ${requestGps ? 'active' : ''}`}
        onClick={(e) => { tapEffect(e); setRequestGps(true); }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" strokeWidth="2" />
          <circle cx="12" cy="12" r="8.5" strokeWidth="1.5" />
          <line x1="12" y1="2" x2="12" y2="4.5" strokeWidth="2" />
          <line x1="12" y1="19.5" x2="12" y2="22" strokeWidth="2" />
          <line x1="2" y1="12" x2="4.5" y2="12" strokeWidth="2" />
          <line x1="19.5" y1="12" x2="22" y2="12" strokeWidth="2" />
        </svg>
      </div>

      <StoreBottomSheet
        store={selectedStore}
        userLocation={userLocation}
        onClose={() => setSelectedStore(null)}
      />

      <MenuDrawer 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onShowToast={showToast}
        user={user}
      />

      {toastMessage && (
        <div className="global-toast" role="status" aria-live="polite" aria-atomic="true">
          {toastMessage}
        </div>
      )}
    </>
  );
}

export default function HomeClient() {
  return (
    <Suspense fallback={
      <div className="loading-overlay">
        <div className="loading-spinner-wrapper">
          <div className="loading-logo">
            24시<span style={{ color: 'var(--accent-neon)' }}>나우</span>
          </div>
          <div className="loading-pulse-dot" />
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
