'use client';

import { useEffect, useRef, useState } from 'react';

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

interface KakaoMapProps {
  stores?: Store[];
  onBoundsChange?: (bounds: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } }) => void;
  onMarkerClick?: (store: Store) => void;
  requestGps?: boolean; // Trigger GPS
  onGpsComplete?: () => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ stores = [], onBoundsChange, onMarkerClick, requestGps, onGpsComplete }: KakaoMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Initialize Map
  useEffect(() => {
    const kakao = window.kakao;
    if (!mapElement.current || !kakao) return;

    kakao.maps.load(() => {
      if (!mapRef.current) {
        // Default to Seoul City Hall
        const center = new kakao.maps.LatLng(37.5665, 126.9780);
        const options = {
          center: center,
          level: 5, // Zoomed in closer for app feel
        };
        mapRef.current = new kakao.maps.Map(mapElement.current, options);
        setMapLoaded(true);

        // Bind idle event for Bounding Box search
        kakao.maps.event.addListener(mapRef.current, 'idle', () => {
          if (onBoundsChange) {
            const bounds = mapRef.current.getBounds();
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            onBoundsChange({
              sw: { lat: sw.getLat(), lng: sw.getLng() },
              ne: { lat: ne.getLat(), lng: ne.getLng() }
            });
          }
        });
      }
    });
  }, []);

  // 2. Handle GPS Request
  useEffect(() => {
    if (!requestGps || !mapLoaded || !mapRef.current) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const locPosition = new window.kakao.maps.LatLng(lat, lon);
          
          mapRef.current.setCenter(locPosition);
          
          // Trigger bounds change manually after GPS move
          setTimeout(() => {
            if (onBoundsChange) {
              const bounds = mapRef.current.getBounds();
              onBoundsChange({
                sw: { lat: bounds.getSouthWest().getLat(), lng: bounds.getSouthWest().getLng() },
                ne: { lat: bounds.getNorthEast().getLat(), lng: bounds.getNorthEast().getLng() }
              });
            }
          }, 300);

          if (onGpsComplete) onGpsComplete();
        },
        (error) => {
          console.warn("GPS Error:", error);
          if (onGpsComplete) onGpsComplete();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [requestGps, mapLoaded]);

  // 3. Render Markers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const kakao = window.kakao;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    stores.forEach(store => {
      if (!store.latitude || !store.longitude) return;

      const position = new kakao.maps.LatLng(store.latitude, store.longitude);
      
      const content = document.createElement('div');
      content.style.width = '14px';
      content.style.height = '14px';
      content.style.background = store.trust_score > 60 ? '#ADFF2F' : '#8e8e93';
      content.style.borderRadius = '50%';
      content.style.border = '2px solid #000';
      content.style.boxShadow = store.trust_score > 60 ? '0 0 10px #ADFF2F' : 'none';
      content.style.cursor = 'pointer';
      
      content.onclick = () => {
        if (onMarkerClick) onMarkerClick(store);
        mapRef.current.panTo(position); // Center on click
      };

      const customOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 0.5,
        xAnchor: 0.5,
        clickable: true
      });

      customOverlay.setMap(mapRef.current);
      markersRef.current.push(customOverlay);
    });
  }, [stores, mapLoaded]);

  return (
    <div 
      ref={mapElement} 
      className="map-container"
    />
  );
}
