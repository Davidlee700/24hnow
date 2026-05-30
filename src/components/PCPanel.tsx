'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Store } from '@/types/store';
import { getOpenStatus } from '@/utils/openHours';
import { CATEGORY_TAGS } from '@/hooks/useTagVotes';

/* ── Apple iOS 색체계 (라이트 모드) ─────────────────────── */
const C = {
  bg:        '#F2F2F7',   // iOS grouped background
  surface:   '#FFFFFF',
  label:     '#000000',
  secondary: 'rgba(60,60,67,0.6)',
  tertiary:  'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.12)',
  blue:      '#007AFF',
  green:     '#34C759',
  orange:    '#FF9F0A',
  red:       '#FF3B30',
};

/* ── 카테고리 이모지 ─────────────────────────────────────── */
const EMOJI: Record<string, string> = {
  카페:'☕', 편의점:'🏪', 셀프세차장:'🚗', PC방:'🎮',
  약국:'💊', 셀프빨래방:'🫧', 찜질방:'🛁', 화장실:'🚻', '주유/충전':'⛽️',
};

const FILTERS = ['카페','편의점','약국','셀프빨래방','셀프세차장','찜질방','PC방','화장실','주유/충전'];

/* ── Haversine 거리 ──────────────────────────────────────── */
function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*d2r)*Math.cos(lat2*d2r)*Math.sin(dLng/2)**2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`;
}

/* ── 영업 상태 ───────────────────────────────────────────── */
function useStoreStatus(store: Store) {
  const now = new Date();
  if (store.operation_type === '24H') return { label: '24시간', color: C.green, dot: C.green };
  const s = getOpenStatus(store, now);
  if (s?.isOpen === true)  return { label: s.label, color: C.green,  dot: C.green  };
  if (s?.isOpen === null)  return { label: '시간 미확인', color: C.orange, dot: C.orange };
  return { label: s?.label ?? '영업종료', color: C.tertiary, dot: C.tertiary };
}

/* ── 매장 카드 ───────────────────────────────────────────── */
function StoreCard({ store, userLoc, onClick }: {
  store: Store;
  userLoc: { lat: number; lng: number } | null;
  onClick: () => void;
}) {
  const status = useStoreStatus(store);
  const emoji  = EMOJI[store.category] ?? '📍';
  const dist   = userLoc ? distance(userLoc.lat, userLoc.lng, store.latitude, store.longitude) : null;
  const addr   = (store.road_address ?? '').split(' ').slice(1, 4).join(' ');

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer',
        borderBottom: `0.5px solid ${C.separator}`,
        background: C.surface,
      }}
    >
      {/* Emoji icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: C.bg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 22, flexShrink: 0,
        border: `0.5px solid ${C.separator}`,
      }}>
        {emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600, color: C.label,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          letterSpacing: '-0.02em', marginBottom: 3,
        }}>
          {store.name}
        </div>
        <div style={{
          fontSize: 13, color: C.secondary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {addr}
        </div>
      </div>

      {/* Right meta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: status.color }}>{status.label}</span>
        </div>
        {dist && <span style={{ fontSize: 11, color: C.tertiary }}>{dist}</span>}
      </div>
    </motion.div>
  );
}

/* ── 매장 상세 ───────────────────────────────────────────── */
function StoreDetail({ store, userLoc, onBack }: {
  store: Store;
  userLoc: { lat: number; lng: number } | null;
  onBack: () => void;
}) {
  const status = useStoreStatus(store);
  const emoji  = EMOJI[store.category] ?? '📍';
  const phone  = store.metadata?.phone;
  const dist   = userLoc ? distance(userLoc.lat, userLoc.lng, store.latitude, store.longitude) : null;
  const directionsUrl = `https://map.kakao.com/link/to/${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;

  return (
    <motion.div
      key="detail"
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Navigation bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '12px 16px 8px', borderBottom: `0.5px solid ${C.separator}`,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', color: C.blue,
            fontSize: 16, fontWeight: 400, cursor: 'pointer',
            fontFamily: 'inherit', padding: '4px 0',
          }}
        >
          <svg width="9" height="16" viewBox="0 0 9 16" fill="none">
            <path d="M8 1L1 8L8 15" stroke={C.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 16, marginLeft: 4 }}>목록</span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h2 style={{
            fontSize: 22, fontWeight: 700, color: C.label,
            letterSpacing: '-0.025em', lineHeight: 1.2, margin: 0,
            wordBreak: 'keep-all',
          }}>
            {store.name}
          </h2>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: C.bg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24, flexShrink: 0,
            border: `0.5px solid ${C.separator}`,
          }}>
            {emoji}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, color: C.secondary }}>{store.category}</span>
          <span style={{ color: C.separator }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot }} />
            <span style={{ fontSize: 15, fontWeight: 500, color: status.color }}>{status.label}</span>
          </div>
          {dist && <>
            <span style={{ color: C.separator }}>·</span>
            <span style={{ fontSize: 15, color: C.secondary }}>{dist}</span>
          </>}
        </div>

        {/* Action buttons — Apple Maps style */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {phone && (
            <a href={`tel:${phone}`} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 5, padding: '12px 8px',
              background: C.bg, borderRadius: 12,
              textDecoration: 'none', border: `0.5px solid ${C.separator}`,
              transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: 20 }}>📞</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: C.blue }}>전화</span>
            </a>
          )}
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 5, padding: '12px 8px',
            background: C.blue, borderRadius: 12,
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: 20 }}>🗺️</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>길찾기</span>
          </a>
          <a href={`/stores/${store.id}`} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 5, padding: '12px 8px',
            background: C.bg, borderRadius: 12,
            textDecoration: 'none', border: `0.5px solid ${C.separator}`,
          }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.blue }}>리뷰</span>
          </a>
        </div>

        {/* Info rows — Apple grouped table style */}
        <div style={{
          background: C.surface, borderRadius: 12,
          border: `0.5px solid ${C.separator}`,
          overflow: 'hidden', marginBottom: 16,
        }}>
          {store.road_address && (
            <InfoRow icon="📍" label={store.road_address} isLast={!phone && store.operation_type === '24H'} />
          )}
          {phone && (
            <InfoRow icon="📞" label={phone} isLast={store.operation_type === '24H'} />
          )}
          <InfoRow icon="🕐" label={status.label} valueColor={status.color} isLast />
        </div>

        {/* Caution for unknown hours */}
        {status.color === C.orange && (
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,159,10,0.08)',
            border: `0.5px solid rgba(255,159,10,0.2)`,
            fontSize: 13, color: C.orange, lineHeight: 1.5, marginBottom: 16,
          }}>
            영업시간 정보가 확인되지 않았어요. 방문 전 전화 확인을 권장합니다.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InfoRow({ icon, label, valueColor, isLast }: {
  icon: string; label: string; valueColor?: string; isLast?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : `0.5px solid ${C.separator}`,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 14, color: valueColor ?? C.secondary, lineHeight: 1.4, wordBreak: 'keep-all' }}>{label}</span>
    </div>
  );
}

/* ── Store List ──────────────────────────────────────────── */
function StoreList({ stores, userLoc, onSelect, activeFilter, openNowOnly, onToggleOpenNow, onSelectFilter }: {
  stores: Store[];
  userLoc: { lat: number; lng: number } | null;
  onSelect: (s: Store) => void;
  activeFilter: string;
  openNowOnly: boolean;
  onToggleOpenNow: () => void;
  onSelectFilter: (f: string) => void;
}) {
  if (stores.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ padding: '80px 24px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>💡</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.label, marginBottom: 6 }}>
          {openNowOnly ? `이 근처엔 지금 열린 ${activeFilter}이(가) 없네요` : `이 근처엔 ${activeFilter} 정보가 없어요`}
        </p>
        <p style={{ fontSize: 14, color: C.secondary, lineHeight: 1.5, marginBottom: 24 }}>
          지도를 넓게 보거나<br/>아래 옵션을 선택해보세요.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          {openNowOnly && (
            <button 
              onClick={onToggleOpenNow}
              style={{ padding: '10px 20px', borderRadius: '20px', background: C.bg, border: `1px solid ${C.separator}`, color: C.label, fontWeight: 600, fontSize: '14px', cursor: 'pointer', width: '100%', maxWidth: '200px' }}
            >
              영업중 필터 끄기
            </button>
          )}
          
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="list"
      initial={{ x: -24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -24, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
    >
      <div style={{
        padding: '10px 16px 6px',
        fontSize: 12, fontWeight: 600,
        color: C.tertiary, letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        {stores.length}개 장소
      </div>
      <div style={{
        background: C.surface,
        borderTop: `0.5px solid ${C.separator}`,
        borderBottom: `0.5px solid ${C.separator}`,
      }}>
        {stores.map(s => (
          <StoreCard key={s.id} store={s} userLoc={userLoc} onClick={() => onSelect(s)} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── PCPanel (main export) ───────────────────────────────── */
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

export default function PCPanel({
  stores, selectedStore, activeFilter, activeTag,
  openNowOnly, userLocation,
  onSelectFilter, onToggleTag, onToggleOpenNow, onSelectStore, onMenuOpen,
}: PCPanelProps) {
  const tags = CATEGORY_TAGS[activeFilter] ?? [];

  return (
    <aside style={{
      width: 360, flexShrink: 0, height: '100dvh',
      background: C.bg, display: 'flex', flexDirection: 'column',
      borderRight: `0.5px solid ${C.separator}`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
    }}>

      {/* ── Navigation bar ── */}
      <div style={{
        padding: '16px 16px 0',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 14,
        }}>
          <a href="/" style={{
            textDecoration: 'none', color: C.label,
            fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em',
          }}>
            24시<span style={{ color: 'var(--accent-brand)' }}>나우</span>
          </a>
          <button
            onClick={onMenuOpen}
            aria-label="메뉴"
            style={{
              background: C.surface, border: `0.5px solid ${C.separator}`,
              borderRadius: 8, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.secondary,
            }}
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
              <rect x="0" y="0" width="16" height="1.5" rx="0.75"/>
              <rect x="0" y="5.25" width="16" height="1.5" rx="0.75"/>
              <rect x="0" y="10.5" width="16" height="1.5" rx="0.75"/>
            </svg>
          </button>
        </div>

        {/* ── Real-time Community Feed ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: C.label, margin: 0 }}>실시간 심야 피드</h3>
            <span style={{ fontSize: '13px', color: C.blue, fontWeight: '600', cursor: 'pointer' }}>제보하기</span>
          </div>

          <div style={{ background: C.surface, padding: '14px', borderRadius: '16px', border: `0.5px solid ${C.separator}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>🚻</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: C.label }}>강남역 11번 출구 화장실</span>
            </div>
            <p style={{ fontSize: '13px', color: C.secondary, margin: '0 0 8px 0', lineHeight: 1.4 }}>
              방금 갔는데 문 잠겨있어요. 옆 건물 스벅 화장실 개방되어 있으니 거기로 가세요!
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: C.tertiary, fontWeight: '500' }}>
              <span>방금 전</span>
              <span>배달마스터</span>
              <span style={{ marginLeft: 'auto', color: C.red }}>🔥 핫제보</span>
            </div>
          </div>

          <div style={{ background: C.surface, padding: '14px', borderRadius: '16px', border: `0.5px solid ${C.separator}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>🫧</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: C.label }}>크린토피아 코인워시</span>
            </div>
            <p style={{ fontSize: '13px', color: C.secondary, margin: '0 0 8px 0', lineHeight: 1.4 }}>
              여기 지금 사람 없고 따뜻해서 대기하기 좋습니다 ㅎㅎ 충전기 꽂을 곳도 2개 비어있네요.
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: C.tertiary, fontWeight: '500' }}>
              <span>15분 전</span>
              <span>신림라이더</span>
            </div>
          </div>

          <div style={{ background: C.surface, padding: '14px', borderRadius: '16px', border: `0.5px solid ${C.separator}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>⛽️</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: C.label }}>SK엔크린 관악주유소</span>
            </div>
            <p style={{ fontSize: '13px', color: C.secondary, margin: '0 0 8px 0', lineHeight: 1.4 }}>
              전기 바이크 배터리 스테이션 새로 들어왔네요! 참고하세요.
            </p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: C.tertiary, fontWeight: '500' }}>
              <span>2시간 전</span>
              <span>스쿠터7</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content (list ↔ detail with spring animation) ── */}
      <div style={{ flex: 1, overflowY: selectedStore ? 'hidden' : 'auto', position: 'relative', scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="wait">
          {selectedStore ? (
            <StoreDetail
              key={`detail-${selectedStore.id}`}
              store={selectedStore}
              userLoc={userLocation}
              onBack={() => onSelectStore(null)}
            />
          ) : (
            <StoreList
              key="list"
              stores={stores}
              userLoc={userLocation}
              onSelect={onSelectStore}
              activeFilter={activeFilter}
              openNowOnly={openNowOnly}
              onToggleOpenNow={() => onToggleOpenNow(null as any)}
              onSelectFilter={(f) => onSelectFilter(f, null as any)}
            />
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
