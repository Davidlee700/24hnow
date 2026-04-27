'use client';

import { useState, useEffect, useRef } from 'react';
import type { Store } from '@/types/store';
import { useTagVotes } from '@/hooks/useTagVotes';

interface Props {
  store: Store | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

function relativeTime(isoString: string): string {
  const days = Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
  if (days === 0) return '오늘 확인됨';
  if (days === 1) return '1일 전 확인됨';
  return `${days}일 전 확인됨`;
}

function tapEffect(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove('tap-bounce');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('tap-bounce');
  el.addEventListener('animationend', () => el.classList.remove('tap-bounce'), { once: true });
}

export default function StoreBottomSheet({ store, userLocation, onClose }: Props) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { votes, vote, hasVoted, votedTag, tags } = useTagVotes(store?.id ?? null, store?.category ?? '');

  // Clear toast when store changes
  useEffect(() => {
    setToastMsg(null);
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
    e.currentTarget.classList.add('vote-glow-anim');
    e.currentTarget.addEventListener('animationend', (ev) => {
      (ev.target as HTMLElement).classList.remove('vote-glow-anim');
    }, { once: true });

    const msg = await vote(tag);
    if (msg) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMsg(msg);
      toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
    }
  };

  return (
    <div className={`bottom-sheet ${store ? 'open' : ''}`} style={{ position: 'absolute' }}>
      {/* Toast notification */}
      {toastMsg && (
        <div className="vote-toast">{toastMsg}</div>
      )}

      <div className="drag-handle" onClick={onClose} />

      {store && (
        <div className="sheet-content">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
              <h2 className="title-1" style={{ marginBottom: '4px' }}>{store.name}</h2>
              <p className="caption">{store.category} · {store.road_address}</p>
            </div>
            <span className={`badge ${store.trust_score > 60 ? 'badge-verified' : 'badge-warning'}`}>
              {store.trust_score > 60
                ? <><span className="status-dot" />운영 중</>
                : '확인 필요'}
            </span>
          </div>

          {/* Info chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
              신뢰도 {store.trust_score}점
            </span>
            {store.last_verified_at && (
              <span style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                {relativeTime(store.last_verified_at)}
              </span>
            )}
          </div>

          {/* Phone */}
          {store.metadata?.phone && (
            <a
              href={`tel:${store.metadata.phone}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', color: 'var(--accent-blue)', fontSize: '15px', textDecoration: 'none' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              {store.metadata.phone}
            </a>
          )}

          {/* Map links */}
          {(store.metadata?.place_url || store.metadata?.naver_place_url) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {store.metadata.place_url && (
                <a href={store.metadata.place_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  카카오맵 →
                </a>
              )}
              {store.metadata.naver_place_url && (
                <a href={store.metadata.naver_place_url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', background: 'var(--tertiary-bg)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  네이버지도 →
                </a>
              )}
            </div>
          )}

          {/* Tag voting */}
          {tags.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                {hasVoted ? '방문 정보가 반영됐어요 ✓' : '이 장소는 어떤가요?'}
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
                    {(votes[tag] ?? 0) > 0 && (
                      <span className="tag-count">{votes[tag]}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="ios-button primary" onClick={(e) => { tapEffect(e); onClose(); }}>닫기</button>
            <button className="ios-button" onClick={(e) => { tapEffect(e); openDirections(); }}>길찾기</button>
          </div>
        </div>
      )}
    </div>
  );
}
