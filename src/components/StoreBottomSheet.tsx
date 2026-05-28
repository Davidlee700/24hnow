'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Store } from '@/types/store';
import { getOpenStatus, getTodayHoursLine } from '@/utils/openHours';
import { useTagVotes } from '@/hooks/useTagVotes';
import { useBookmarks } from '@/hooks/useBookmarks';
import StoreReviews from './StoreReviews';
import { FRANCHISE_DEFAULTS } from '@/lib/franchise-constants';

interface Props {
  store: Store | null;
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

function formatApiTime(timeStr: string): string {
  if (!timeStr) return '';
  const time = parseInt(timeStr);
  if (time === 2400) return '24:00';
  if (time === 0) return '00:00';
  if (time > 2400) {
    const hour = Math.floor((time - 2400) / 100);
    const min = time % 100;
    return `익일 ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}`;
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
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const { isBookmarked, toggleBookmark, folders, addToFolder } = useBookmarks();
  const [hasVotedHours, setHasVotedHours] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState<0 | 1 | 2>(0);
  const [feedbackChoice, setFeedbackChoice] = useState<'OPEN' | 'CLOSED' | null>(null);
  const [feedbackDetail, setFeedbackDetail] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [showHoursEditor, setShowHoursEditor] = useState(false);
  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  const [hoursInput, setHoursInput] = useState(() =>
    DAYS.map(d => ({ day: d, open: '09:00', close: '22:00', closed: false }))
  );
  const [hoursSubmitting, setHoursSubmitting] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { votes, vote, hasVoted, votedTag, tags } = useTagVotes(store?.id ?? null, store?.category ?? '');

  useEffect(() => {
    setToastMsg(null);
    setShowFullHours(false);
    setIsReporting(false);
    setReportType(null);
    setReportComment('');
    setBookmarkFilling(false);
    setShowFolderPicker(false);
    setShowHoursEditor(false);
    setHoursInput(DAYS.map(d => ({ day: d, open: '09:00', close: '22:00', closed: false })));
    setHoursSubmitting(false);
    setIsExpanded(false);
    setHasVotedHours(!!localStorage.getItem(`voted_hours_${store?.id}`));
    setFeedbackStep(0);
    setFeedbackChoice(null);
    setFeedbackDetail(null);
    setReviewCount(null);
  }, [store?.id]);

  const openDirections = () => {
    if (!store) return;

    // Google Analytics Event Tracking for Outbound Clicks
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click_directions', {
        event_category: 'outbound_link',
        event_label: store.name,
        store_id: store.id,
        store_category: store.category,
      });
    }

    const dest = `${encodeURIComponent(store.name)},${store.latitude},${store.longitude}`;
    const url = userLocation
      ? `https://map.kakao.com/link/from/현재위치,${userLocation.lat},${userLocation.lng}/to/${dest}`
      : `https://map.kakao.com/link/to/${dest}`;
    window.open(url, '_blank');
  };

  const handlePhoneCall = (e: React.MouseEvent<HTMLElement>) => {
    if (!store || !store.metadata?.phone) return;
    tapEffect(e);

    // Google Analytics Event Tracking for Outbound Call
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click_phone', {
        event_category: 'outbound_link',
        event_label: store.name,
        store_id: store.id,
      });
    }

    window.location.href = `tel:${store.metadata?.phone}`;
  };

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  };

  const handleBookmark = async (e: React.MouseEvent<HTMLElement>) => {
    if (!store) return;
    tapEffect(e);

    // If already bookmarked, remove directly without picker
    if (isBookmarked(store.id)) {
      setBookmarkFilling(true);
      setTimeout(() => setBookmarkFilling(false), 400);
      const result = await toggleBookmark({
        id: store.id, name: store.name, category: store.category,
        road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
      });
      showToast(result.needsLogin ? '로그인 후 저장 기능을 이용할 수 있어요' : result.success ? '저장이 취소됐어요' : '저장에 실패했어요. 다시 시도해 주세요.');
      return;
    }

    // If 2+ folders exist, show folder picker
    if (folders.length >= 2) {
      setShowFolderPicker(true);
      return;
    }

    // Single folder — save directly
    setBookmarkFilling(true);
    setTimeout(() => setBookmarkFilling(false), 400);
    const result = await toggleBookmark({
      id: store.id, name: store.name, category: store.category,
      road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
    });
    showToast(result.needsLogin ? '로그인 후 저장 기능을 이용할 수 있어요' : result.success ? '아지트에 저장됐어요 🧡' : '저장에 실패했어요. 다시 시도해 주세요.');
  };

  const handleHoursSubmit = async () => {
    if (!store) return;
    setHoursSubmitting(true);
    const rawHours = hoursInput
      .filter(r => !r.closed)
      .map(r => {
        const open = r.open.replace(':', '').padStart(4, '0');
        const close = r.close.replace(':', '').padStart(4, '0');
        return `${r.day}: ${open}-${close}`;
      })
      .join(' ');

    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          report_type: 'HOURS_SUBMIT',
          comment: rawHours.slice(0, 200),
          session_id: getSessionId(),
          hours_data: rawHours,
        }),
      });
      setShowHoursEditor(false);
      showToast('영업시간 제보 감사해요! 바로 반영됐어요 ✅');
    } catch {
      showToast('제보 전송에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setHoursSubmitting(false);
    }
  };

  const handleSaveToFolder = async (folderId: string) => {
    if (!store) return;
    setShowFolderPicker(false);
    setBookmarkFilling(true);
    setTimeout(() => setBookmarkFilling(false), 400);
    const result = await addToFolder({
      id: store.id, name: store.name, category: store.category,
      road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
    }, folderId);
    showToast(result.needsLogin ? '로그인 후 저장 기능을 이용할 수 있어요' : result.limitReached ? '이 폴더는 가득 찼어요 (최대 100개)' : result.success ? '아지트에 저장됐어요 🧡' : '저장에 실패했어요. 다시 시도해 주세요.');
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

  const handleFeedbackSubmit = async (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    if (!store || !feedbackDetail) return;
    setHasVotedHours(true);
    localStorage.setItem(`voted_hours_${store.id}`, '1');
    setFeedbackStep(2);
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id, report_type: feedbackDetail, session_id: getSessionId() }),
      });
    } catch {
      // silent — step 2 already shown
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

    // Google Analytics Event Tracking for Social Sharing
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'click_share_kakao', {
        event_category: 'social_share',
        event_label: store.name,
        store_id: store.id,
      });
    }

    const kakao = (window as any).Kakao;
    if (!kakao) { setToastMsg('카카오 SDK를 불러오는 중이에요. 1~2초 후 다시 시도해 주세요.'); return; }
    if (!kakao.isInitialized()) {
      try { kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''); }
      catch { setToastMsg('카카오 초기화에 실패했습니다.'); return; }
    }
    if (!kakao.Share) { setToastMsg('공유 기능을 사용할 수 없는 환경이에요.'); return; }

    const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://24now.kr';
    const storeUrl = `${BASE}/stores/${store.id}`;
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    const isOpen = store.operation_type === '24H' || openStatus?.isOpen === true;

    const CATEGORY_EMOJI: Record<string, string> = {
      카페: '☕', 편의점: '🏪', 셀프세차장: '🚗', PC방: '🎮',
      약국: '💊', 코인노래방: '🎤', 셀프빨래방: '🫧', 찜질방: '🛁',
      복권판매점: '🎰',
    };
    const emoji = CATEGORY_EMOJI[store.category] ?? '📍';

    const title = isOpen
      ? `${store.name} 지금 열려 있어요 ${emoji}`
      : `${store.name} ${emoji}`;

    const timeCtx = isNight ? '새벽에도' : '지금도';
    const description = `${store.category} · ${timeCtx} 문 열어요.\n24시나우에서 내 주변 24시간 장소를 찾아보세요.`;

    const ogParams = new URLSearchParams({
      name: store.name,
      category: store.category,
      status: isOpen ? 'open' : '',
    });
    const imageUrl = `${BASE}/api/og?${ogParams.toString()}`;

    kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description,
        imageUrl,
        link: { mobileWebUrl: storeUrl, webUrl: storeUrl },
      },
      buttons: [{ title: '지도에서 보기', link: { mobileWebUrl: storeUrl, webUrl: storeUrl } }],
    });
  };

  const rawScore = store?.trust_score ?? 0;
  const trustPct = Math.min(100, Math.round(rawScore > 1 ? rawScore : rawScore * 100));
  const isConfirmed = store ? (store.confidence_level === 'HIGH' || (!store.confidence_level && store.class_type === 'A')) : false;
  const openStatus = store ? getOpenStatus(store) : null;
  const todayHoursLine = store ? getTodayHoursLine(store) : null;

  function openStatusIcon(): string {
    if (!openStatus || openStatus.isOpen === null) return '⚪';
    if (openStatus.closingSoon) return '⏰';
    return openStatus.isOpen ? '🟢' : '🔴';
  }

  function openStatusColor(): string {
    if (!openStatus || openStatus.isOpen === null) return 'var(--text-secondary)';
    if (openStatus.closingSoon) return '#FF9F0A';
    return openStatus.isOpen ? 'var(--accent-neon)' : '#FF453A';
  }

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
          drag={isExpanded ? false : 'y'}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => {
            const { offset, velocity } = info;
            if (velocity.y > 500 || offset.y > 80) { onClose(); return; }
            if (velocity.y < -300 || offset.y < -80) { setIsExpanded(true); return; }
          }}
          layout
        >
          {/* ── Folder Picker Sheet ── */}
          <AnimatePresence>
            {showFolderPicker && (
              <motion.div
                key="folder-picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 'inherit', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
                onClick={() => setShowFolderPicker(false)}
              >
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 260 }}
                  style={{ background: 'var(--bg-secondary, #1C1C1E)', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px' }}
                  onClick={e => e.stopPropagation()}
                >
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
                    어느 폴더에 저장할까요?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => handleSaveToFolder(folder.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '14px', background: 'var(--material-thin)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '0.5px solid var(--border-light)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.2s' }}
                      >
                        <span style={{ fontSize: '22px' }}>{folder.emoji}</span>
                        <span style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 500 }}>{folder.name}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowFolderPicker(false)}
                    style={{ marginTop: '12px', width: '100%', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    취소
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {toastMsg && <div className="vote-toast">{toastMsg}</div>}
          <div
            className="drag-handle"
            onClick={() => isExpanded ? setIsExpanded(false) : undefined}
            style={{ cursor: isExpanded ? 'pointer' : 'default' }}
          />

          <div
            className="sheet-content"
            style={isExpanded ? { overflowY: 'auto', maxHeight: '80vh' } : undefined}
          >
            {!isReporting ? (
              <>
                {/* ── Layer 1: Header (Identity) ── */}
                <div className="sheet-layer sheet-identity" style={{ paddingBottom: '12px', textAlign: 'center' }}>
                  <h2 className="sheet-store-name" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>{store.name}</h2>
                  <p className="sheet-store-meta" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {store.category}
                    {userLocation && ` · ${calcDistance(userLocation, store)}`}
                    <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                    신뢰도 {trustPct}% {store.last_verified_at && `· ${relativeTime(store.last_verified_at)}`}
                  </p>
                </div>

                {/* ── Layer 2: Action Bar (Primary Actions) ── */}
                <div className="action-bar" style={{ marginBottom: '16px' }}>
                  <button className={`action-btn${bookmarkFilling ? ' filling' : ''}`} onClick={handleBookmark}>
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
                  
                  <button className="action-btn" disabled={!store.metadata?.phone} onClick={handlePhoneCall}>
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

                {/* ── Layer 3: Info Card (Grouped Settings Style) ── */}
                <div className="info-card">
                  <div className="info-row-compact">
                    <div className="info-icon">📍</div>
                    <div className="info-content">
                      <span className="info-text" style={{ wordBreak: 'keep-all' }}>{store.road_address || '주소 정보 없음'}</span>
                    </div>
                  </div>
                  
                  <div className="info-row-compact" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: (store.raw_hours || store.business_hours) ? 'pointer' : 'default' }}
                        onClick={() => (store.raw_hours || store.business_hours) && setShowFullHours(!showFullHours)}
                      >
                        <div className="info-icon">{openStatusIcon()}</div>
                        <div className="info-content">
                          {/* 1줄: 상태 라벨 */}
                          <span className="info-text" style={{ fontWeight: openStatus?.isOpen ? 600 : 400, color: openStatusColor() }}>
                            {openStatus?.label ?? '영업시간 미확인'}
                          </span>
                          {/* 2줄: 오늘 구체 시간 (금 10:00 - 24:00) */}
                          {todayHoursLine && (
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {todayHoursLine}
                            </span>
                          )}
                          {openStatus?.isOpen === false && openStatus.opensAt && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {openStatus.opensAt}에 오픈
                            </span>
                          )}
                          {/* 상세시간 토글 */}
                          {(store.raw_hours || store.business_hours) && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              전체 요일 {showFullHours ? '▴' : '▾'}
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Accordion for Full Week Hours */}
                    <AnimatePresence>
                      {showFullHours && (store.raw_hours || store.business_hours) && (
                        <motion.div
                          className="hours-accordion"
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {store.raw_hours
                            ? (() => {
                                const todayDayName = ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()];
                                return store.raw_hours.split(' ').map((h, i) => {
                                  const parts = h.match(/(.*): (\d{4})-(\d{4})/);
                                  if (!parts) return <div key={i}>{h}</div>;
                                  const isToday = parts[1] === todayDayName;
                                  return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                      <span>{parts[1]}{isToday && <span style={{ fontSize: '10px', marginLeft: '4px', color: openStatusColor() }}>오늘</span>}</span>
                                      <span>{formatApiTime(parts[2])} - {formatApiTime(parts[3])}</span>
                                    </div>
                                  );
                                });
                              })()
                            : store.business_hours?.weekdayDescriptions?.map((line: string, i: number) => (
                                <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{line}</div>
                              ))
                          }
                        </motion.div>
                      )}
                    </AnimatePresence>
                  {/* 영업시간 수정 제보 트리거 */}
                  {!showHoursEditor && (
                    <button
                      onClick={() => setShowHoursEditor(true)}
                      style={{ background: 'none', border: 'none', padding: '6px 0 0 44px', fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', display: 'block' }}
                    >
                      ✏️ 영업시간 수정 제보
                    </button>
                  )}

                  {/* 요일별 영업시간 에디터 */}
                  <AnimatePresence>
                    {showHoursEditor && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ background: 'var(--material-thin)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '0.5px solid var(--border-light)', borderRadius: '14px', padding: '14px' }}>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
                            요일별 영업시간을 알려주세요
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {hoursInput.map((row, i) => (
                              <div key={row.day} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '20px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>{row.day}</span>
                                {row.closed ? (
                                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', flex: 1 }}>휴무</span>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                    <input
                                      type="time"
                                      value={row.open}
                                      onChange={e => setHoursInput(prev => prev.map((r, j) => j === i ? { ...r, open: e.target.value } : r))}
                                      style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', padding: '6px 8px', colorScheme: 'dark' }}
                                    />
                                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>~</span>
                                    <input
                                      type="time"
                                      value={row.close}
                                      onChange={e => setHoursInput(prev => prev.map((r, j) => j === i ? { ...r, close: e.target.value } : r))}
                                      style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', padding: '6px 8px', colorScheme: 'dark' }}
                                    />
                                  </div>
                                )}
                                <button
                                  onClick={() => setHoursInput(prev => prev.map((r, j) => j === i ? { ...r, closed: !r.closed } : r))}
                                  style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '8px', border: 'none', background: row.closed ? 'rgba(255,69,58,0.2)' : 'rgba(255,255,255,0.08)', color: row.closed ? '#FF453A' : 'var(--text-tertiary)', cursor: 'pointer', flexShrink: 0 }}
                                >
                                  {row.closed ? '취소' : '휴무'}
                                </button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                            <button
                              onClick={() => setShowHoursEditor(false)}
                              style={{ flex: 1, padding: '11px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer' }}
                            >
                              취소
                            </button>
                            <button
                              onClick={handleHoursSubmit}
                              disabled={hoursSubmitting}
                              style={{ flex: 2, padding: '11px', borderRadius: '12px', background: '#0A84FF', border: 'none', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              {hoursSubmitting ? '제보 중...' : '제보하기'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                </div>

                {/* ── Layer 3.5: Hours Feedback Card — UNKNOWN/EXTENDED 또는 영업상태 불명 매장만 표시 ── */}
                {!hasVotedHours && (store.operation_type === 'UNKNOWN' || store.operation_type === 'EXTENDED' || (store.operation_type === 'REGULAR' && !store.raw_hours) || openStatus?.isOpen === null) && (
                  <div className="info-card" style={{ padding: '16px', marginBottom: '12px' }}>
                    <AnimatePresence mode="wait">
                      {feedbackStep === 0 && (
                        <motion.div key="step0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 500 }}>
                            지금 이 매장 어때요?
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => { setFeedbackChoice('OPEN'); setFeedbackStep(1); }}
                              style={{ flex: 1, padding: '12px 8px', borderRadius: '12px', background: 'rgba(52,199,89,0.12)', border: '1.5px solid rgba(52,199,89,0.3)', color: '#34C759', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              🟢 열려 있어요
                            </button>
                            <button
                              onClick={() => { setFeedbackChoice('CLOSED'); setFeedbackStep(1); }}
                              style={{ flex: 1, padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,69,58,0.12)', border: '1.5px solid rgba(255,69,58,0.3)', color: '#FF453A', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              🔴 닫혀 있어요
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {feedbackStep === 1 && feedbackChoice === 'OPEN' && (
                        <motion.div key="step1-open" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <button onClick={() => { setFeedbackStep(0); setFeedbackChoice(null); setFeedbackDetail(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>몇 시까지 영업하나요?</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                            {[
                              { label: '자정 (00:00까지)', value: 'OPEN_UNTIL_MIDNIGHT' },
                              { label: '새벽 1시까지', value: 'OPEN_UNTIL_1AM' },
                              { label: '새벽 2시까지', value: 'OPEN_UNTIL_2AM' },
                              { label: '24시간 영업해요', value: 'OPEN_24H' },
                              { label: '잘 모르겠어요', value: 'OPEN_UNKNOWN' },
                            ].map((opt) => (
                              <div
                                key={opt.value}
                                onClick={() => setFeedbackDetail(opt.value)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', background: feedbackDetail === opt.value ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.05)', border: feedbackDetail === opt.value ? '1.5px solid rgba(10,132,255,0.5)' : '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                              >
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: feedbackDetail === opt.value ? '5px solid #0A84FF' : '2px solid rgba(255,255,255,0.3)', flexShrink: 0, transition: 'all 0.15s ease' }} />
                                <span style={{ fontSize: '14px', color: feedbackDetail === opt.value ? 'white' : 'var(--text-secondary)' }}>{opt.label}</span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={handleFeedbackSubmit}
                            disabled={!feedbackDetail}
                            style={{ width: '100%', padding: '13px', borderRadius: '12px', background: feedbackDetail ? '#0A84FF' : 'rgba(255,255,255,0.08)', border: 'none', color: feedbackDetail ? 'white' : 'var(--text-tertiary)', fontSize: '15px', fontWeight: 600, cursor: feedbackDetail ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
                          >
                            완료
                          </button>
                        </motion.div>
                      )}

                      {feedbackStep === 1 && feedbackChoice === 'CLOSED' && (
                        <motion.div key="step1-closed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <button onClick={() => { setFeedbackStep(0); setFeedbackChoice(null); setFeedbackDetail(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>‹</button>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>왜 닫혀있나요?</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                            {[
                              { label: '영업시간이 끝났어요', value: 'CLOSED_HOURS_END' },
                              { label: '오늘 쉬는 날이에요', value: 'CLOSED_TODAY_OFF' },
                              { label: '폐업한 것 같아요', value: 'CLOSED_PERMANENTLY' },
                            ].map((opt) => (
                              <div
                                key={opt.value}
                                onClick={() => setFeedbackDetail(opt.value)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', background: feedbackDetail === opt.value ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.05)', border: feedbackDetail === opt.value ? '1.5px solid rgba(10,132,255,0.5)' : '1.5px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                              >
                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: feedbackDetail === opt.value ? '5px solid #0A84FF' : '2px solid rgba(255,255,255,0.3)', flexShrink: 0, transition: 'all 0.15s ease' }} />
                                <span style={{ fontSize: '14px', color: feedbackDetail === opt.value ? 'white' : 'var(--text-secondary)' }}>{opt.label}</span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={handleFeedbackSubmit}
                            disabled={!feedbackDetail}
                            style={{ width: '100%', padding: '13px', borderRadius: '12px', background: feedbackDetail ? '#0A84FF' : 'rgba(255,255,255,0.08)', border: 'none', color: feedbackDetail ? 'white' : 'var(--text-tertiary)', fontSize: '15px', fontWeight: 600, cursor: feedbackDetail ? 'pointer' : 'default', transition: 'all 0.2s ease' }}
                          >
                            완료
                          </button>
                        </motion.div>
                      )}

                      {feedbackStep === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>✅</span>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>제보해 주셔서 감사해요. 데이터 개선에 도움이 됩니다.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {!isConfirmed && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', padding: '0 8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '14px', color: '#FF9F0A' }}>⚠️</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {store.operation_type === 'UNKNOWN' || !openStatus || openStatus.isOpen === null
                        ? '영업시간 정보가 아직 확인되지 않았어요. 방문 전 전화로 확인을 권장합니다.'
                        : '영업시간은 추정 정보입니다. 늦은 시간 방문 전 전화 확인을 권장합니다.'}
                    </span>
                  </div>
                )}

                {/* ── Layer 4: Community Card (Vibe Prompt) ── */}
                <div 
                  className="info-card" 
                  style={{ padding: '16px', cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setTimeout(() => {
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  <p className="community-label" style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {hasVoted ? '이미 밤샘 정보를 제보하셨네요! ✓' : (
                      <>
                        아직 이곳의 밤샘 정보가 없어요. 분위기를 골라주세요 💡
                        <span style={{ fontSize: '11px', color: 'var(--accent-blue)', textDecoration: 'underline' }}>분위기 남기기</span>
                      </>
                    )}
                  </p>
                </div>

                {/* ── Layer 5: Review Trigger & Footer ── */}
                <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '24px' }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: isExpanded ? 0 : 1, transition: 'opacity 0.3s', pointerEvents: isExpanded ? 'none' : 'auto' }} onClick={() => setIsExpanded(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'toast-in-out 2s infinite' }}>
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {reviewCount === null || reviewCount === 0 ? '첫 리뷰를 남겨보세요' : '방문 경험을 공유해주세요'}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: '20px' }}>
                    <button onClick={() => setIsReporting(true)} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-tertiary)', textDecoration: 'underline', cursor: 'pointer', opacity: 0.7 }}>
                      잘못된 정보 제보하기
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div id="reviews-section">
                    <StoreReviews 
                      storeId={store.id} 
                      availableTags={tags} 
                      onLoad={setReviewCount} 
                      onVote={(tag) => vote(tag)}
                      hasVoted={hasVoted}
                      votedTag={votedTag}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="reporting-form" style={{ animation: 'fade-in 0.3s ease-out', padding: '0 4px' }}>
                <div className="report-nav-header" style={{ marginBottom: '16px' }}>
                  <button className="report-back-btn" onClick={() => setIsReporting(false)}>‹ 뒤로</button>
                  <h2 className="title-1" style={{ fontSize: '18px' }}>정보 수정 제보</h2>
                  <div style={{ width: 52 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                  {[
                    { id: 'NOT_24H', label: '24시간 운영이 아니에요' },
                    { id: 'CLOSED', label: '장소가 존재하지 않아요' },
                    { id: 'OTHER', label: '기타 정보가 잘못되었어요' },
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setReportType(opt.id)}
                      style={{
                        padding: '14px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        border: reportType === opt.id ? '1.5px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: reportType === opt.id ? 'white' : 'var(--text-secondary)' }}>{opt.label}</span>
                      {reportType === opt.id && <span style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>✓</span>}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px', paddingLeft: '4px' }}>상세 내용 (선택, 최대 20자)</p>
                  <input
                    type="text"
                    placeholder="예: 일요일은 밤 12시까지만 해요"
                    maxLength={20}
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  className={`ios-button primary${!reportType || isSubmitting ? ' disabled' : ''}`}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', fontSize: '15px' }}
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
