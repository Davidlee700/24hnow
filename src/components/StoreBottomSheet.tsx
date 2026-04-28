'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const match = rawHours.match(new RegExp(`${today}: (\\d{4})-(\\d{4})`));
  if (match) return `오늘(${today}) ${formatApiTime(match[1])} - ${formatApiTime(match[2])}`;
  if (rawHours.includes('24시간') || rawHours.includes('0000-2400')) return `오늘(${today}) 24시간 운영`;
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
  if (d < 1.5) return `도보 ${Math.round(d / 0.067)}분`;
  return `차로 ${Math.round(d / 0.4)}분`;
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return '방금 확인됨';
  if (h < 24) return `${h}시간 전 확인`;
  const d = Math.floor(h / 24);
  return d === 1 ? '어제 확인' : `${d}일 전 확인`;
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
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkFilling, setBookmarkFilling] = useState(false);
  const [hasVotedHours, setHasVotedHours] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { votes, vote, hasVoted, votedTag, tags } = useTagVotes(store?.id ?? null, store?.category ?? '');

  useEffect(() => {
    setToastMsg(null);
    setShowFullHours(false);
    setIsReporting(false);
    setReportType(null);
    setReportComment('');
    setBookmarked(false);
    setBookmarkFilling(false);
    setShowBadgeInfo(false);
    setHasVotedHours(!!localStorage.getItem(`voted_hours_${store?.id}`));
  }, [store?.id]);

  const openDirections = () => {
    if (!store) return;
    const dest = `${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;
    const url = userLocation
      ? `https://map.kakao.com/link/from/현재위치,${userLocation.lat},${userLocation.lng}/to/${dest}`
      : `https://map.kakao.com/link/to/${dest}`;
    window.open(url, '_blank');
  };

  const handleBookmark = (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    setBookmarked(true);
    setBookmarkFilling(true);
    setTimeout(() => setBookmarkFilling(false), 400);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg('로그인 후 저장 기능을 이용할 수 있어요');
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

  const handleHoursVote = async (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    if (!store || hasVotedHours) return;
    setHasVotedHours(true);
    localStorage.setItem(`voted_hours_${store.id}`, '1');
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: store.id, tag: '24시간 운영' }),
    });
    const data = await res.json();
    if (data.message) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMsg(data.message);
      toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
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
        body: JSON.stringify({ store_id: store.id, report_type: reportType, comment: reportComment }),
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
        title: `[24시나우] ${store.name}`,
        description: `${store.category} · 지금 당장 이용 가능해요!`,
        imageUrl: 'https://24hnow.vercel.app/og-image.png',
        link: {
          mobileWebUrl: `https://24hnow.vercel.app/?store=${store.id}`,
          webUrl: `https://24hnow.vercel.app/?store=${store.id}`,
        },
      },
      buttons: [{ title: '지도에서 보기', link: { mobileWebUrl: `https://24hnow.vercel.app/?store=${store.id}`, webUrl: `https://24hnow.vercel.app/?store=${store.id}` } }],
    });
  };

  const trustPct = Math.round((store?.trust_score ?? 0) * 100);

  return (
    <AnimatePresence>
      {store && (
        <motion.div
          key="bottom-sheet"
          className="bottom-sheet open"
          style={{ position: 'absolute', zIndex: 1000 }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 500) onClose();
          }}
        >
          {toastMsg && <div className="vote-toast">{toastMsg}</div>}
          <div className="drag-handle" />

          <div className="sheet-content">
            {!isReporting ? (
              <>
                {/* ── Layer 1: Identity ── */}
                <div className="sheet-layer sheet-identity">
                  <div className="sheet-identity-main">
                    <h2 className="sheet-store-name">{store.name}</h2>
                    <p className="sheet-store-meta">
                      {store.category}
                      {userLocation && ` · ${calcDistance(userLocation, store)}`}
                    </p>
                  </div>
                  <button
                    className={`bookmark-btn${bookmarkFilling ? ' filling' : ''}`}
                    onClick={handleBookmark}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}
                  >
                    {bookmarked ? '🧡' : '🤍'}
                  </button>
                </div>

                {/* ── Layer 2: Confidence ── */}
                <div className="sheet-layer sheet-confidence">
                  <div className="confidence-header">
                    <div className="confidence-status">
                      {store.class_type === 'A'
                        ? <><span className="status-dot" /><span>운영 확인됨</span></>
                        : <><span>🔍</span><span>정보 확인 중</span></>
                      }
                    </div>
                    {store.class_type !== 'A' && (
                      <div style={{ position: 'relative' }}>
                        <button
                          className="badge-info-btn"
                          onClick={() => setShowBadgeInfo(v => !v)}
                        >ⓘ</button>
                        {showBadgeInfo && (
                          <div className="badge-popover">
                            네이버·카카오 데이터 기반으로 24시간 운영이 추정되나, 아직 커뮤니티 검증이 충분하지 않아요.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="trust-bar-row">
                    <div className="trust-bar-track">
                      <div className="trust-bar-fill" style={{ width: `${trustPct}%` }} />
                    </div>
                    <span className="trust-score-label">신뢰도 {trustPct}%</span>
                  </div>
                  {store.last_verified_at && (
                    <p className="last-verified-label">{relativeTime(store.last_verified_at)}</p>
                  )}

                  <div className="confidence-divider" />

                  <button className="hours-toggle" onClick={() => setShowFullHours(!showFullHours)}>
                    <span>🕐</span>
                    <span className="hours-toggle-text">{getTodayHours(store.raw_hours)}</span>
                    <span className={`hours-chevron${showFullHours ? ' open' : ''}`}>▾</span>
                  </button>

                  {showFullHours && store.raw_hours && (
                    <div className="hours-detail">
                      {store.raw_hours.split(' ').map((h, i) => {
                        const parts = h.match(/(.*): (\d{4})-(\d{4})/);
                        if (parts) return <p key={i}>{parts[1]}: {formatApiTime(parts[2])} - {formatApiTime(parts[3])}</p>;
                        return <p key={i}>{h}</p>;
                      })}
                    </div>
                  )}

                  {store.class_type !== 'A' && store.inference_note && (
                    <p className="inference-note">💡 {store.inference_note}</p>
                  )}

                  {store.class_type !== 'A' && !hasVotedHours && (
                    <div className="hours-vote-row">
                      <button className="confirm-vote-btn yes" onClick={handleHoursVote}>👍 맞아요</button>
                      <button className="confirm-vote-btn no" onClick={() => setIsReporting(true)}>👎 아니에요</button>
                    </div>
                  )}
                </div>

                {/* ── Layer 3: Community ── */}
                {tags.length > 0 && (
                  <div className="sheet-layer sheet-community">
                    <p className="community-label">
                      {hasVoted ? '밤샘 정보 반영 완료 ✓' : '밤샘 분위기를 알려주세요'}
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
                                  className={`tag-vote-btn${hasVoted && votedTag === tag ? ' voted' : ''}`}
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

                {/* ── Actions ── */}
                <div className="sheet-actions">
                  <button className="share-icon-btn" onClick={shareToKakao}>
                    <span style={{ fontSize: '20px' }}>💬</span>
                  </button>
                  <button className="ios-button primary" style={{ flex: 1 }} onClick={openDirections}>
                    길찾기
                  </button>
                </div>
                <button className="report-text-btn" onClick={() => setIsReporting(true)}>
                  수정 제보하기
                </button>
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
                  className={`ios-button primary${!reportType || isSubmitting ? ' disabled' : ''}`}
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
