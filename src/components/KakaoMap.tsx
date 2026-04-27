'use client';

import { useEffect, useRef, useState } from 'react';
import type { Store, MapBounds } from '@/types/store';

interface KakaoMapProps {
  stores?: Store[];
  onBoundsChange?: (bounds: MapBounds) => void;
  onMarkerClick?: (store: Store) => void;
  requestGps?: boolean;
  onGpsComplete?: () => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

declare global {
  interface Window { kakao: any; }
}

const CATEGORY_STYLE: Record<string, { bg: string; emoji: string }> = {
  '카페':       { bg: '#B07B40', emoji: '☕' },
  '편의점':     { bg: '#0A84FF', emoji: '🏪' },
  '셀프세차장': { bg: '#30D158', emoji: '🚗' },
  'PC방':       { bg: '#5856D6', emoji: '🎮' },
  '약국':       { bg: '#FF2D55', emoji: '💊' },
};
const DEFAULT_STYLE = { bg: '#8e8e93', emoji: '📍' };

export default function KakaoMap({ stores = [], onBoundsChange, onMarkerClick, requestGps, onGpsComplete, onLocationUpdate }: KakaoMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Initialize map
  useEffect(() => {
    const kakao = window.kakao;
    if (!mapElement.current || !kakao) return;

    kakao.maps.load(() => {
      if (!mapRef.current) {
        const center = new kakao.maps.LatLng(37.5665, 126.9780);
        mapRef.current = new kakao.maps.Map(mapElement.current, { center, level: 5 });
        setMapLoaded(true);

        kakao.maps.event.addListener(mapRef.current, 'idle', () => {
          if (!onBoundsChange) return;
          const b = mapRef.current.getBounds();
          onBoundsChange({
            sw: { lat: b.getSouthWest().getLat(), lng: b.getSouthWest().getLng() },
            ne: { lat: b.getNorthEast().getLat(), lng: b.getNorthEast().getLng() },
          });
        });
      }
    });
  }, []);

  // 2. GPS
  useEffect(() => {
    if (!requestGps || !mapLoaded || !mapRef.current) return;

    if (!navigator.geolocation) { onGpsComplete?.(); return; }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const locPosition = new window.kakao.maps.LatLng(lat, lng);
        mapRef.current.setCenter(locPosition);
        onLocationUpdate?.(lat, lng);
        setTimeout(() => {
          const b = mapRef.current.getBounds();
          onBoundsChange?.({
            sw: { lat: b.getSouthWest().getLat(), lng: b.getSouthWest().getLng() },
            ne: { lat: b.getNorthEast().getLat(), lng: b.getNorthEast().getLng() },
          });
        }, 300);
        onGpsComplete?.();
      },
      (err) => { console.warn('GPS Error:', err); onGpsComplete?.(); },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [requestGps, mapLoaded]);

  // 3. Render markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const kakao = window.kakao;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach(store => {
      if (!store.latitude || !store.longitude) return;

      const position = new kakao.maps.LatLng(store.latitude, store.longitude);
      const { bg, emoji } = CATEGORY_STYLE[store.category] ?? DEFAULT_STYLE;
      const isConfirmed = store.class_type === 'A';
      const isEstimated = store.class_type === 'B';

      const el = document.createElement('div');
      el.style.cssText = `
        width:40px;height:40px;
        background:${isConfirmed ? bg : `rgba(25, 25, 25, 0.65)`};
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        border-radius:50%;
        border:2px solid ${isConfirmed ? 'white' : 'rgba(255,255,255,0.4)'};
        box-shadow:0 4px 12px rgba(0,0,0,0.6)${isConfirmed ? `, 0 0 15px ${bg}cc` : ''};
        opacity:1;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        font-size:20px;line-height:1;user-select:none;
        filter:invert(1) hue-rotate(180deg) brightness(1.2) contrast(1.1);
        transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        z-index: ${isConfirmed ? '100' : '10'};
      `;
      
      // Class A 전용 펄스 애니메이션 (추가 CSS 필요)
      if (isConfirmed) {
        el.classList.add('marker-pulse');
      }

      el.textContent = emoji;
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3) translateY(-4px)';
        el.style.zIndex = '999';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = isConfirmed ? '100' : '10';
      });
      el.onclick = () => { onMarkerClick?.(store); mapRef.current.panTo(position); };

      const overlay = new kakao.maps.CustomOverlay({ position, content: el, yAnchor: 0.5, xAnchor: 0.5, clickable: true });
      overlay.setMap(mapRef.current);
      markersRef.current.push(overlay);
    });
  }, [stores, mapLoaded]);

  return <div ref={mapElement} className="map-container" />;
}
