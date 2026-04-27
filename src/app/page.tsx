'use client';

import { useState, useEffect } from 'react';
import KakaoMap from "@/components/KakaoMap";
import { supabase } from '@/lib/supabase';

interface Store {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  trust_score: number;
  road_address: string;
  metadata: any;
}

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("전체");
  const [stores, setStores] = useState<Store[]>([]);
  const [bounds, setBounds] = useState<{ sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [requestGps, setRequestGps] = useState(true); // Default request on load

  const filters = ["전체", "카페", "편의점", "셀프세차장"];

  // Fetch stores whenever bounds or filter changes
  useEffect(() => {
    if (bounds) {
      fetchStoresInBounds();
    }
  }, [bounds, activeFilter]);

  async function fetchStoresInBounds() {
    if (!bounds) return;

    let query = supabase
      .from('stores')
      .select('*')
      .gte('latitude', bounds.sw.lat)
      .lte('latitude', bounds.ne.lat)
      .gte('longitude', bounds.sw.lng)
      .lte('longitude', bounds.ne.lng);

    if (activeFilter !== "전체") {
      query = query.eq('category', activeFilter);
    }

    // Limit to prevent massive loads if zoomed out too far
    const { data, error } = await query.order('trust_score', { ascending: false }).limit(100);

    if (!error && data) {
      setStores(data);
    }
  }

  const handleMarkerClick = (store: Store) => {
    setSelectedStore(store);
  };

  const closeBottomSheet = () => {
    setSelectedStore(null);
  };

  return (
    <>
      <KakaoMap 
        stores={stores} 
        onBoundsChange={setBounds} 
        onMarkerClick={handleMarkerClick}
        requestGps={requestGps}
        onGpsComplete={() => setRequestGps(false)}
      />

      {/* Floating UI: Top */}
      <div className="floating-top">
        <div className="floating-search-bar">
          <div className="brand-title">24h <span style={{color: 'var(--accent-neon)'}}>Now</span></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>

        <div className="filter-container">
          {filters.map((filter) => (
            <div 
              key={filter} 
              className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => {
                setActiveFilter(filter);
                setSelectedStore(null); // Close sheet on filter change
              }}
            >
              {filter}
            </div>
          ))}
        </div>
      </div>

      {/* Floating UI: GPS Button */}
      <div className={`gps-button ${requestGps ? 'active' : ''}`} onClick={() => setRequestGps(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
      </div>

      {/* Bottom Sheet Drawer */}
      <div className={`bottom-sheet ${selectedStore ? 'open' : ''}`}>
        <div className="drag-handle" onClick={closeBottomSheet}></div>
        
        {selectedStore && (
          <div className="sheet-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="title-1" style={{ marginBottom: '4px' }}>{selectedStore.name}</h2>
                <p className="caption">{selectedStore.category} · {selectedStore.road_address}</p>
              </div>
              <span className={`badge ${selectedStore.trust_score > 60 ? 'badge-verified' : 'badge-warning'}`}>
                {selectedStore.trust_score > 60 ? '● 운영 중' : '확인 필요'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', margin: '8px 0' }}>
              <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                신뢰도 {selectedStore.trust_score}점
              </span>
              {selectedStore.metadata?.source === 'kakao_api' && (
                <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                  카카오 검증됨
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button className="ios-button primary" onClick={closeBottomSheet}>
                닫기
              </button>
              <button 
                className="ios-button" 
                onClick={() => window.open(`https://map.kakao.com/link/to/${selectedStore.name},${selectedStore.latitude},${selectedStore.longitude}`, '_blank')}
              >
                길찾기
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
