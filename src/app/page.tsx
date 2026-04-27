'use client';

import { useState } from 'react';
import KakaoMap from '@/components/KakaoMap';
import StoreBottomSheet from '@/components/StoreBottomSheet';
import { useStores } from '@/hooks/useStores';
import type { Store, MapBounds } from '@/types/store';

const FILTERS = ['전체', '카페', '편의점', '셀프세차장'];

export default function Home() {
  const [activeFilter, setActiveFilter] = useState('전체');
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [requestGps, setRequestGps] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { stores, reportedStores, reportStore } = useStores(bounds, activeFilter);

  return (
    <>
      <KakaoMap
        stores={stores}
        onBoundsChange={setBounds}
        onMarkerClick={setSelectedStore}
        requestGps={requestGps}
        onGpsComplete={() => setRequestGps(false)}
        onLocationUpdate={(lat, lng) => setUserLocation({ lat, lng })}
      />

      {/* Top bar */}
      <div className="floating-top">
        <div className="floating-search-bar">
          <div className="brand-title">24시 <span style={{ color: 'var(--accent-neon)' }}>나우</span></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div className="filter-container">
          {FILTERS.map(filter => (
            <div
              key={filter}
              className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => { setActiveFilter(filter); setSelectedStore(null); }}
            >
              {filter}
            </div>
          ))}
        </div>
      </div>

      {/* GPS button */}
      <div className={`gps-button ${requestGps ? 'active' : ''}`} onClick={() => setRequestGps(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <StoreBottomSheet
        store={selectedStore}
        reportedStores={reportedStores}
        userLocation={userLocation}
        onClose={() => setSelectedStore(null)}
        onReport={reportStore}
      />
    </>
  );
}
