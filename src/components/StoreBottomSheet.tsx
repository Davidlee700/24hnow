'use client';

import { useState, useEffect, useRef } from 'react';
import type { Store } from '@/types/store';
import { useTagVotes } from '@/hooks/useTagVotes';

interface Props {
  store: Store | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

function formatApiTime(timeStr: string): string {
  if (!timeStr) return '';
  const time = parseInt(timeStr);
  if (time === 2400 || time === 0) return '자정(00:00)';
  if (time > 2400) {
    const hour = Math.floor((time - 2400) / 100);
    const min = time % 100;
    return `익일 ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
}

function getTodayHours(rawHours?: string): string {
  if (!rawHours) return '24시간 운영 (추정)';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const today = days[new Date().getDay()];
  
  // Parse format: "월: 0900-2500"
  const match = rawHours.match(new RegExp(`${today}: (\\d{4})-(\\d{4})`));
  if (match) {
    const start = formatApiTime(match[1]);
    const end = formatApiTime(match[2]);
    return `오늘(${today})은 ${start} - ${end}`;
  }
  
  if (rawHours.includes('24시간') || rawHours.includes('0000-2400')) return `오늘(${today})은 24시간 운영`;
  return '영업시간 확인 필요';
}

function tapEffect(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove('tap-bounce');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('tap-bounce');
  el.addEventListener('animationend', () => el.classList.remove('tap-bounce'), { once: true });
}

export default function StoreBottomSheet({ store, userLocation, onClose }: Props) {
  const [showFullHours, setShowFullHours] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { votes, vote, hasVoted, votedTag, tags } = useTagVotes(store?.id ?? null, store?.category ?? '');

  useEffect(() => {
    setToastMsg(null);
    setShowFullHours(false);
  }, [store?.id]);

  const openDirections = () => {
    if (!store) return;
    const dest = `${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;
    const url = userLocation
      ? `https://map.kakao.com/link/from/현재위치,${userLocation.lat},${userLocation.lng}/to/${dest}`
      : `https://map.kakao.com/link/to/${dest}`;
    window.open(url, '_blank');
  };

  const handleVote = async (e: React.MouseEvent<HTMLElement>, tag: string) => {
    tapEffect(e);
    const msg = await vote(tag);
    if (msg) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMsg(msg);
      toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
    }
  };

  return (
    <div className={`bottom-sheet ${store ? 'open' : ''}`} style={{ position: 'absolute' }}>
      {toastMsg && <div className="vote-toast">{toastMsg}</div>}
      <div className="drag-handle" onClick={onClose} />

      {store && (
        <div className="sheet-content">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="title-1" style={{ marginBottom: '4px', letterSpacing: '-0.5px' }}>{store.name}</h2>
              <p className="caption" style={{ color: 'var(--text-secondary)' }}>
                {store.category} · {store.road_address}
                <span style={{ marginLeft: '8px', color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(store.name)}`, '_blank')}>
                  리뷰 999+ →
                </span>
              </p>
            </div>
            <div className={`badge ${store.class_type === 'A' ? 'badge-verified' : 'badge-warning'}`} style={{ padding: '6px 12px', borderRadius: '20px' }}>
              {store.class_type === 'A' ? <><span className="status-dot" />운영 중</> : '정보 확인 중'}
            </div>
          </div>

          {/* Today's Hour & Verification Card */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setShowFullHours(!showFullHours)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🕐</span>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {getTodayHours(store.raw_hours)}
                  </p>
                  {store.class_type !== 'A' && (
                    <p style={{ fontSize: '12px', color: 'var(--accent-orange)', marginTop: '2px' }}>💡 {store.inference_note}</p>
                  )}
                </div>
              </div>
              <span style={{ transform: showFullHours ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▼</span>
            </div>
            
            {showFullHours && store.raw_hours && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {store.raw_hours.split(' ').map((h, i) => {
                  const parts = h.match(/(.*): (\d{4})-(\d{4})/);
                  if (parts) {
                    return <p key={i}>{parts[1]}: {formatApiTime(parts[2])} - {formatApiTime(parts[3])}</p>;
                  }
                  return <p key={i}>{h}</p>;
                })}
              </div>
            )}

            {store.class_type !== 'A' && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button 
                  className="ios-button" 
                  style={{ flex: 1, padding: '8px', fontSize: '13px', background: 'rgba(48,209,88,0.15)', color: '#30D158' }}
                  onClick={(e) => { tapEffect(e); setToastMsg('제보해주셔서 감사합니다!'); }}
                >
                  지금 24시 맞아요 👍
                </button>
                <button 
                  className="ios-button" 
                  style={{ flex: 1, padding: '8px', fontSize: '13px', background: 'rgba(255,69,58,0.15)', color: '#FF453A' }}
                  onClick={(e) => { tapEffect(e); setToastMsg('소중한 정보 감사합니다.'); }}
                >
                  24시 아니에요 👎
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>
              {hasVoted ? '방문 정보가 반영되었습니다 ✓' : '이곳의 밤샘 분위기는 어떤가요?'}
            </p>
            <div className="tag-vote-grid">
              {tags.map(tag => (
                <button
                  key={tag}
                  className={`tag-vote-btn${hasVoted && votedTag === tag ? ' voted' : ''}`}
                  disabled={hasVoted}
                  onClick={(e) => handleVote(e, tag)}
                >
                  <span>{tag}</span>
                  {(votes[tag] ?? 0) > 0 && <span className="tag-count">{votes[tag]}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="ios-button" style={{ flex: 1, background: 'var(--tertiary-bg)' }} onClick={onClose}>닫기</button>
            <button className="ios-button primary" style={{ flex: 2 }} onClick={openDirections}>길찾기</button>
          </div>
          <p 
            style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', opacity: 0.6, cursor: 'pointer' }}
            onClick={() => setToastMsg('수정 제보가 접수되었습니다.')}
          >
            정보가 다른가요? 수정 제보하기
          </p>
        </div>
      )}
    </div>
  );
}
