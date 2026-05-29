'use client';

import { useEffect, useRef, useState } from 'react';
import type { Store, MapBounds } from '@/types/store';
import { getOpenStatus } from '@/utils/openHours';

interface KakaoMapProps {
  stores?: Store[];
  center?: { lat: number; lng: number } | null;
  onBoundsChange?: (bounds: MapBounds | null, isZoom?: boolean) => void;
  onMarkerClick?: (store: Store) => void;
  onMapClick?: () => void;
  requestGps?: boolean;
  onGpsComplete?: () => void;
  onGpsError?: (msg: string) => void;
  onLocationUpdate?: (lat: number, lng: number) => void;
  dimmed?: boolean;
  markerPanOffset?: number;
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
  '코인노래방': { bg: '#FF6B35', emoji: '🎤' },
  '셀프빨래방': { bg: '#32ADE6', emoji: '🫧' },
  '찜질방':     { bg: '#FF9F0A', emoji: '🛁' },
  '복권판매점':  { bg: '#34C759', emoji: '🎰' },
};
const DEFAULT_STYLE = { bg: '#8e8e93', emoji: '📍' };

export default function KakaoMap({ stores = [], center, onBoundsChange, onMarkerClick, onMapClick, requestGps, onGpsComplete, onGpsError, onLocationUpdate, dimmed, markerPanOffset = 180 }: KakaoMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationOverlayRef = useRef<any>(null);
  const isZoomingRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(4);

  // 1. Initialize map
  useEffect(() => {
    const kakao = window.kakao;
    if (!mapElement.current || !kakao) return;

    const initMap = () => {
      if (mapRef.current || !mapElement.current) return;
      const center = new kakao.maps.LatLng(37.5665, 126.9780);
      mapRef.current = new kakao.maps.Map(mapElement.current, { center, level: 5 });
      mapRef.current.setMaxLevel(8);
      setMapLoaded(true);

      kakao.maps.event.addListener(mapRef.current, 'idle', () => {
        const isZoom = isZoomingRef.current;
        isZoomingRef.current = false;
        const level = mapRef.current.getLevel();
        setZoomLevel(level);

        const labels = document.querySelectorAll('.marker-label');
        labels.forEach((l: any) => {
          l.style.opacity = level <= 4 ? '1' : '0';
        });

        if (!onBoundsChange) return;
        if (level > 7) {
          onBoundsChange(null, isZoom);
          return;
        }
        const b = mapRef.current.getBounds();
        onBoundsChange({
          sw: { lat: b.getSouthWest().getLat(), lng: b.getSouthWest().getLng() },
          ne: { lat: b.getNorthEast().getLat(), lng: b.getNorthEast().getLng() },
        }, isZoom);
      });

      kakao.maps.event.addListener(mapRef.current, 'click', () => {
        onMapClick?.();
      });

      kakao.maps.event.addListener(mapRef.current, 'zoom_changed', () => {
        isZoomingRef.current = true;
        setZoomLevel(mapRef.current.getLevel());
      });
    };

    // SDK already initialized (e.g., remount after isDesktop toggle) → call directly
    if (kakao.maps.Map) {
      initMap();
    } else {
      kakao.maps.load(initMap);
    }
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

        // 현재 위치 블루닷 + 정확도 반경
        if (locationOverlayRef.current) locationOverlayRef.current.setMap(null);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: relative; width: 18px; height: 18px;
          pointer-events: none;
        `;
        const accuracyRing = document.createElement('div');
        accuracyRing.style.cssText = `
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 56px; height: 56px;
          border-radius: 50%;
          background: rgba(10,132,255,0.12);
          border: 1.5px solid rgba(10,132,255,0.35);
        `;
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: 18px; height: 18px;
          background: #0A84FF;
          border: 3px solid #ffffff;
          border-radius: 50%;
          position: relative; z-index: 1;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          animation: location-pulse 2.5s ease-in-out infinite;
        `;
        wrapper.appendChild(accuracyRing);
        wrapper.appendChild(dot);

        const locOverlay = new window.kakao.maps.CustomOverlay({
          position: locPosition, content: wrapper,
          yAnchor: 0.5, xAnchor: 0.5, zIndex: 400,
        });
        locOverlay.setMap(mapRef.current);
        locationOverlayRef.current = locOverlay;
        if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
        gpsTimerRef.current = setTimeout(() => {
          const level = mapRef.current.getLevel();
          if (level > 7) {
            onBoundsChange?.(null);
            return;
          }
          const b = mapRef.current.getBounds();
          onBoundsChange?.({
            sw: { lat: b.getSouthWest().getLat(), lng: b.getSouthWest().getLng() },
            ne: { lat: b.getNorthEast().getLat(), lng: b.getNorthEast().getLng() },
          });
        }, 300);
        onGpsComplete?.();
      },
      (err) => {
        console.warn('GPS Error:', err);
        if (err.code === 1) { // PERMISSION_DENIED
          const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const msg = isMobile 
            ? "위치 권한이 꺼져 있어요. 브라우저 설정에서 위치 권한을 '허용'으로 변경해 주세요."
            : "위치 권한이 꺼져 있어요. 주소창 옆 자물쇠 아이콘을 눌러 위치 권한을 허용해 주세요.";
          onGpsError?.(msg);
        }
        onGpsComplete?.();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
    return () => {
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    };
  }, [requestGps, mapLoaded]);

  // 3. Handle external center change (e.g., deep linking)
  useEffect(() => {
    if (!mapRef.current || !center) return;
    const kakao = window.kakao;
    const moveLatLng = new kakao.maps.LatLng(center.lat, center.lng);
    mapRef.current.panTo(moveLatLng);
  }, [center, mapLoaded]);

  // 4. Render markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const kakao = window.kakao;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const now = new Date();

    stores.forEach(store => {
      if (!store.latitude || !store.longitude) return;

      const position = new kakao.maps.LatLng(store.latitude, store.longitude);
      const { bg, emoji } = CATEGORY_STYLE[store.category] ?? DEFAULT_STYLE;
      const isConfirmed = store.confidence_level === 'HIGH' || (!store.confidence_level && store.class_type === 'A');
      const isLowConfidence = store.confidence_level === 'LOW';
      const operationType = store.operation_type;
      // 24H는 항상 열려있으므로 계산 생략, 나머지는 실시간 판단
      const openStatus = operationType === '24H' ? null : getOpenStatus(store, now);
      const isOpen = operationType === '24H' || openStatus?.isOpen === true;

      // 열려있으면 카테고리 색 테두리, 닫혔으면 흰색
      const borderColor = isOpen ? bg : 'white';

      const markerOpacity = (!isOpen || isLowConfidence) ? '0.4' : '1';
      const zIdx = isOpen ? '100' : '10';

      const el = document.createElement('div');
      el.style.cssText = `
        width:40px;height:40px;
        background:rgba(255, 255, 255, 0.95);
        border-radius:50%;
        border:2.5px solid ${borderColor};
        box-shadow:0 0 12px ${borderColor === 'white' ? 'rgba(255,255,255,0.3)' : borderColor}, 0 4px 12px rgba(0,0,0,0.6);
        opacity:${markerOpacity};cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        font-size:22px;line-height:1;user-select:none;
        transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
        z-index: ${zIdx};
        position: relative;
      `;

      el.textContent = emoji;

      // "곧 마감" 뱃지
      if (openStatus?.closingSoon) {
        const badge = document.createElement('div');
        badge.style.cssText = `
          position: absolute; top: -4px; right: -4px;
          width: 16px; height: 16px;
          background: #FF9F0A; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; line-height: 1; z-index: 1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `;
        badge.textContent = '⏰';
        el.appendChild(badge);
      }

      const label = document.createElement('div');
      label.className = 'marker-label';
      label.style.cssText = `
        position: absolute;
        bottom: -28px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(20, 20, 20, 0.88);
        backdrop-filter: blur(8px);
        border: 0.5px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 4px 8px;
        color: white;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        opacity: ${mapRef.current?.getLevel() <= 4 ? '1' : '0'};
        transition: opacity 0.2s ease;
      `;
      label.textContent = store.name;
      el.appendChild(label);

      if (isConfirmed && operationType !== 'EXTENDED') {
        el.classList.add('marker-pulse');
      } else if (openStatus?.isOpen) {
        el.classList.add('marker-pulse-soft');
      }

      const overlay = new kakao.maps.CustomOverlay({ position, content: el, yAnchor: 0.5, xAnchor: 0.5, clickable: true });
      overlay.setMap(mapRef.current);
      markersRef.current.push(overlay);

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.25) translateY(-6px)';
        overlay.setZIndex(999);
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        overlay.setZIndex(isConfirmed ? 100 : 10);
      });
      el.onclick = () => {
        onMarkerClick?.(store);
        const proj = mapRef.current.getProjection();
        if (proj && markerPanOffset > 0) {
          const point = proj.pointFromCoords(position);
          point.y += markerPanOffset;
          const offsetLatLng = proj.coordsFromPoint(point);
          mapRef.current.panTo(offsetLatLng);
        } else {
          mapRef.current.panTo(position);
        }
      };
    });
  }, [stores, mapLoaded]);

  return (
    <>
      <div ref={mapElement} className={`map-container${dimmed ? ' dimmed' : ''}`} />
      <div className="zoom-control">
        <button 
          className="zoom-btn" 
          aria-label="확대" 
          disabled={zoomLevel <= 1}
          onClick={() => {
            if (mapRef.current) mapRef.current.setLevel(zoomLevel - 1, { animate: true });
          }}
        >+</button>
        <div className="zoom-divider" />
        <div className="zoom-level-indicator">{9 - zoomLevel}</div>
        <div className="zoom-divider" />
        <button 
          className="zoom-btn" 
          aria-label="축소" 
          disabled={zoomLevel >= 8}
          onClick={() => {
            if (mapRef.current) mapRef.current.setLevel(zoomLevel + 1, { animate: true });
          }}
        >-</button>
      </div>
    </>
  );
}
