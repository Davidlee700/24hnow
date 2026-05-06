import fs from 'fs';

const content = `'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Store } from '@/types/store';
import { useTagVotes } from '@/hooks/useTagVotes';
import { useBookmarks } from '@/hooks/useBookmarks';
import StoreReviews from './StoreReviews';

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
    return \`익일 \${String(hour).padStart(2, '0')}:\${String(min).padStart(2, '0')}\`;
  }
  return \`\${timeStr.slice(0, 2)}:\${timeStr.slice(2, 4)}\`;
}

function getTodayHours(rawHours: string | undefined, confidence: string | undefined, classType: string | undefined): string {
  const isConfirmed = confidence === 'HIGH' || (!confidence && classType === 'A');
  if (!rawHours) return isConfirmed ? '24시간 운영' : '24시간 운영 (추정)';
  
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const today = days[new Date().getDay()];
  const match = rawHours.match(new RegExp(\`\${today}: (\\\\d{4})-(\\\\d{4})\`));
  
  if (match) {
    const start = match[1] === '0000' && match[2] === '2400' ? '24시간' : \`\${formatApiTime(match[1])} - \${formatApiTime(match[2])}\`;
    if (start === '24시간') return isConfirmed ? \`오늘(\${today}) 24시간 운영\` : \`오늘(\${today}) 24시간 운영 (추정)\`;
    return \`오늘(\${today}) \${start}\`;
  }
  
  if (rawHours.includes('24시간') || rawHours.includes('0000-2400')) return isConfirmed ? \`오늘(\${today}) 24시간 운영\` : \`오늘(\${today}) 24시간 운영 (추정)\`;
  return '영업시간 확인 필요';
}

function calcDistance(user: { lat: number; lng: number }, store: { latitude: number; longitude: number }): string {
  const R = 6371;
  const dLat = (store.latitude - user.lat) * Math.PI / 180;
  const dLng = (store.longitude - user.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(user.lat * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (d < 0.15) return '바로 근처';
  if (d < 1.5) return \`도보 \${Math.round(d / 0.067)}분\`;
  return \`차로 \${Math.round(d / 0.4)}분\`;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return '방금 확인됨';
  if (h < 24) return \`\${h}시간 전 확인\`;
  const d = Math.floor(h / 24);
  return d === 1 ? '어제 확인' : \`\${d}일 전 확인\`;
}

function tapEffect(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove('tap-bounce');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('tap-bounce');
  el.addEventListener('animationend', () => el.classList.remove('tap-bounce'), { once: true });
}

const FRANCHISE_DEFAULTS: Record<string, string[]> = {
  '스타벅스': ['여유로운 충전 환경', '몰입을 돕는 분위기'],
  '투썸': ['여유로운 충전 환경'],
  '이디야': ['몰입을 돕는 분위기'],
  '메가커피': ['몰입을 돕는 분위기'],
  'CU': ['상비약 완비'],
  'GS25': ['상비약 완비'],
  '세븐일레븐': ['상비약 완비'],
  '이마트24': ['상비약 완비'],
  '미니스톱': ['상비약 완비'],
};

function getDefaultTags(name: string, tags: string[]): Set<string> {
  for (const [franchise, defaults] of Object.entries(FRANCHISE_DEFAULTS)) {
    if (name.includes(franchise)) return new Set(defaults.filter(d => tags.includes(d)));
  }
  return new Set();
}

export default function StoreBottomSheet({ store, userLocation, onClose }: Props) {
  const [showFullHours, setShowFullHours] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState<string | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [bookmarkFilling, setBookmarkFilling] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [hasVotedHours, setHasVotedHours] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { votes, vote, hasVoted, votedTag, tags } = useTagVotes(store?.id ?? null, store?.category ?? '');

  useEffect(() => {
    setToastMsg(null);
    setShowFullHours(false);
    setIsReporting(false);
    setReportType(null);
    setReportComment('');
    setBookmarkFilling(false);
    setIsExpanded(false);
    setHasVotedHours(!!localStorage.getItem(\`voted_hours_\${store?.id}\`));
  }, [store?.id]);

  const openDirections = () => {
    if (!store) return;
    const dest = \`\${encodeURIComponent(store.name)},\${store.latitude},\${store.longitude}\`;
    const url = userLocation
      ? \`https://map.kakao.com/link/from/현재위치,\${userLocation.lat},\${userLocation.lng}/to/\${dest}\`
      : \`https://map.kakao.com/link/to/\${dest}\`;
    window.open(url, '_blank');
  };

  const handleBookmark = async (e: React.MouseEvent<HTMLElement>) => {
    if (!store) return;
    tapEffect(e);
    setBookmarkFilling(true);
    setTimeout(() => setBookmarkFilling(false), 400);

    const result = await toggleBookmark({
      id: store.id,
      name: store.name,
      category: store.category,
      road_address: store.road_address,
      latitude: store.latitude,
      longitude: store.longitude,
    });

    if (toastTimer.current) clearTimeout(toastTimer.current);
    const msg = result.needsLogin
      ? '로그인 후 저장 기능을 이용할 수 있어요'
      : result.success
        ? result.added ? '아지트에 저장됐어요 🧡' : '저장이 취소됐어요'
        : '저장에 실패했어요. 다시 시도해 주세요.';
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
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

  const getSessionId = () => {
    let sid = localStorage.getItem('24hnow_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('24hnow_session_id', sid);
    }
    return sid;
  };

  const handleMicroFeedback = async (e: React.MouseEvent<HTMLElement>, type: string) => {
    tapEffect(e);
    if (!store || hasVotedHours) return;
    setHasVotedHours(true);
    localStorage.setItem(\`voted_hours_\${store.id}\`, '1');

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id, report_type: type, session_id: getSessionId() }),
      });
      const data = await res.json();
      if (data.message) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastMsg(data.message);
        toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
      }
    } catch {
      setHasVotedHours(false);
      localStorage.removeItem(\`voted_hours_\${store.id}\`);
    }
  };

  const handleReport = async (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    if (!store || !reportType) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id, report_type: reportType, comment: reportComment, session_id: getSessionId() }),
      });
      const data = await res.json();
      setToastMsg(data.success ? data.message : '제보 전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setIsReporting(false);
      setReportType(null);
      setReportComment('');
    } catch {
      setToastMsg('제보 전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
      setIsReporting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareToKakao = (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    if (!store) return;
    const kakao = (window as any).Kakao;
    if (!kakao) { setToastMsg('카카오 SDK를 불러오는 중이에요. 1~2초 후 다시 시도해 주세요.'); return; }
    if (!kakao.isInitialized()) {
      try { kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''); }
      catch { setToastMsg('카카오 초기화에 실패했습니다.'); return; }
    }
    if (!kakao.Share) { setToastMsg('공유 기능을 사용할 수 없는 환경이에요.'); return; }
    kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: \`\${store.name} — 새벽에도 문 열어요\`,
        description: \`\${store.category} · 24시나우에서 발견했어요. 지도에서 바로 확인하세요.\`,
        imageUrl: \`\${process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr'}/og-image.png\`,
        link: {
          mobileWebUrl: \`\${process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr'}/?store=\${store.id}\`,
          webUrl: \`\${process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr'}/?store=\${store.id}\`,
        },
      },
      buttons: [{ title: '지도에서 보기', link: { mobileWebUrl: \`\${process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr'}/?store=\${store.id}\`, webUrl: \`\${process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr'}/?store=\${store.id}\` } }],
    });
  };

  const rawScore = store?.trust_score ?? 0;
  const trustPct = Math.min(100, Math.round(rawScore > 1 ? rawScore : rawScore * 100));
  const isConfirmed = store ? (store.confidence_level === 'HIGH' || (!store.confidence_level && store.class_type === 'A')) : false;

  return (
    <AnimatePresence>
      {store && (
        <motion.div
          key="bottom-sheet"
          className="bottom-sheet open"
          style={{ zIndex: 1000 }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => {
            const { offset, velocity } = info;
            if (isExpanded) {
              if (velocity.y > 300 || offset.y > 80) { setIsExpanded(false); return; }
            } else {
              if (velocity.y > 500 || offset.y > 80) { onClose(); return; }
              if (velocity.y < -300 || offset.y < -80) { setIsExpanded(true); return; }
            }
          }}
          layout
        >
          {toastMsg && <div className="vote-toast">{toastMsg}</div>}
          <div className="drag-handle" />

          <div className="sheet-content">
            {!isReporting ? (
              <>
                {/* ── Layer 1: Header (Identity) ── */}
                <div className="sheet-layer sheet-identity" style={{ paddingBottom: '0' }}>
                  <div className="sheet-identity-main">
                    <h2 className="sheet-store-name" style={{ fontSize: '22px', fontWeight: 700 }}>{store.name}</h2>
                    <p className="sheet-store-meta" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {store.category}
                      {userLocation && \` · \${calcDistance(userLocation, store)}\`}
                    </p>
                  </div>
                </div>

                {/* ── Layer 2: Action Bar (Primary Actions) ── */}
                <div className="action-bar">
                  <button className={\`action-btn\${bookmarkFilling ? ' filling' : ''}\`} onClick={handleBookmark}>
                    <div className="action-icon-wrapper" style={{ color: store && isBookmarked(store.id) ? '#ff453a' : 'var(--text-primary)' }}>
                      {store && isBookmarked(store.id) ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      )}
                    </div>
                    <span className="action-label">{store && isBookmarked(store.id) ? '저장됨' : '저장'}</span>
                  </button>

                  <button className="action-btn" onClick={shareToKakao}>
                    <div className="action-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </div>
                    <span className="action-label">공유</span>
                  </button>
                  
                  <button className="action-btn" disabled={!store.metadata?.phone} onClick={() => { if (store.metadata?.phone) window.location.href = \`tel:\${store.metadata?.phone}\` }}>
                    <div className="action-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>
                    <span className="action-label">전화</span>
                  </button>
                  
                  <button className="action-btn primary" onClick={openDirections}>
                    <div className="action-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                    </div>
                    <span className="action-label">길찾기</span>
                  </button>
                </div>

                {/* ── Layer 3: Info Row (Address & Hours) ── */}
                <div className="sheet-layer" style={{ padding: '0 8px' }}>
                  <div className="info-row">
                    <div className="info-icon">📍</div>
                    <div className="info-content">
                      <span className="info-text" style={{ wordBreak: 'keep-all' }}>{store.road_address || '주소 정보 없음'}</span>
                    </div>
                  </div>
                  
                  <div className="info-row">
                    <div className="info-icon">
                      {isConfirmed ? '🟢' : '🕒'}
                    </div>
                    <div className="info-content">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowFullHours(!showFullHours)}>
                        <span className="info-text" style={{ fontWeight: isConfirmed ? 600 : 400, color: isConfirmed ? 'var(--accent-neon)' : 'inherit' }}>
                          {getTodayHours(store.raw_hours, store.confidence_level, store.class_type)}
                        </span>
                        {store.raw_hours && (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', transform: showFullHours ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                        )}
                      </div>
                      
                      {/* Accordion for Full Week Hours */}
                      <AnimatePresence>
                        {showFullHours && store.raw_hours && (
                          <motion.div 
                            className="hours-accordion"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            {store.raw_hours.split(' ').map((h, i) => {
                              const parts = h.match(/(.*): (\\d{4})-(\\d{4})/);
                              if (parts) return <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{parts[1]}</span><span>{formatApiTime(parts[2])} - {formatApiTime(parts[3])}</span></div>;
                              return <div key={i}>{h}</div>;
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* ── Layer 4: Tags / Community ── */}
                {tags.length > 0 && (
                  <div className="sheet-layer sheet-community">
                    <p className="community-label" style={{ fontSize: '13px', marginBottom: '10px' }}>
                      {hasVoted ? '밤샘 정보 반영 완료 ✓' : '이곳의 분위기는 어떤가요?'}
                    </p>
                    {(() => {
                      const totalVotes = tags.reduce((sum, tag) => sum + (votes[tag] ?? 0), 0);
                      const isEmptyState = totalVotes === 0 && !hasVoted;
                      const defaultTags = getDefaultTags(store.name, tags);
                      return (
                        <>
                          {isEmptyState && (
                            <div className="empty-tag-cta">
                              <p>아직 이곳의 밤샘 정보가 없어요</p>
                              <span>첫 번째로 분위기를 알려주시겠어요?</span>
                            </div>
                          )}
                          <div className="tag-vote-grid">
                            {tags.map(tag => {
                              const isDefault = isEmptyState && defaultTags.has(tag);
                              return (
                                <button
                                  key={tag}
                                  className={\`tag-vote-btn\${hasVoted && votedTag === tag ? ' voted' : ''}\`}
                                  disabled={hasVoted}
                                  onClick={(e) => handleVote(e, tag)}
                                >
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {tag}
                                    {isDefault && <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>예상</span>}
                                    {(votes[tag] ?? 0) > 0 && (
                                      <span style={{ opacity: 0.6, fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px' }}>{votes[tag]}</span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ── Layer 5: Secondary Info / Trust Score (Moved to bottom) ── */}
                <div className="sheet-layer" style={{ background: 'transparent', padding: '0 8px', marginTop: '8px' }}>
                  {!isConfirmed && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <span style={{ fontSize: '14px', color: '#FF9F0A' }}>⚠️</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        상호명 기반으로 24시간 영업이 추정되는 곳입니다. 늦은 시간 방문 전 전화 확인을 권장합니다.
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      신뢰도 {trustPct}% {store.last_verified_at && \`· \${relativeTime(store.last_verified_at)}\`}
                    </span>
                    <button onClick={() => setIsReporting(true)} style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>
                      정보 수정 제보
                    </button>
                  </div>
                  
                  {!isConfirmed && !hasVotedHours && (
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>영업 확인:</span>
                      <button onClick={(e) => handleMicroFeedback(e, 'OPEN')} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: 'none', color: 'white', fontSize: '12px', cursor: 'pointer' }}>🟢 영업 중</button>
                      <button onClick={(e) => handleMicroFeedback(e, 'CLOSED')} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', border: 'none', color: 'white', fontSize: '12px', cursor: 'pointer' }}>🔴 문 닫음</button>
                    </div>
                  )}
                </div>

                {isExpanded && <StoreReviews storeId={store.id} availableTags={tags} />}
              </>
            ) : (
              <div className="reporting-form" style={{ animation: 'fade-in 0.3s ease-out' }}>
                <div className="report-nav-header">
                  <button className="report-back-btn" onClick={() => setIsReporting(false)}>‹ 뒤로</button>
                  <h2 className="title-1" style={{ margin: 0 }}>정보 수정 제보</h2>
                  <div style={{ width: 52 }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { id: 'NOT_24H', label: '24시간 운영이 아니에요' },
                    { id: 'CLOSED', label: '장소가 존재하지 않아요' },
                    { id: 'OTHER', label: '기타 정보가 잘못되었어요' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setReportType(opt.id)}
                      style={{
                        padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        border: reportType === opt.id ? '1.5px solid var(--accent-blue)' : '1.5px solid transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>{opt.label}</span>
                      {reportType === opt.id && <span style={{ color: 'var(--accent-blue)' }}>✓</span>}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>상세 내용 (선택, 최대 20자)</p>
                  <input
                    type="text"
                    placeholder="예: 일요일은 밤 12시까지만 해요"
                    maxLength={20}
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  className={\`ios-button primary\${!reportType || isSubmitting ? ' disabled' : ''}\`}
                  style={{ width: '100%' }}
                  disabled={!reportType || isSubmitting}
                  onClick={handleReport}
                >
                  {isSubmitting ? '전송 중...' : '제보 보내기'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
`;

fs.writeFileSync('src/components/StoreBottomSheet.tsx', content, 'utf8');
console.log('StoreBottomSheet.tsx updated successfully');
