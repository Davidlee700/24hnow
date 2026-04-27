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
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState<string | null>(null);
  const [reportComment, setReportComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { votes, vote, hasVoted, votedTag, tags } = useTagVotes(store?.id ?? null, store?.category ?? '');

  useEffect(() => {
    setToastMsg(null);
    setShowFullHours(false);
    setIsReporting(false);
    setReportType(null);
    setReportComment('');
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

  const handleReport = async (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    if (!store || !reportType) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          report_type: reportType,
          comment: reportComment
        })
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg(data.message);
        setIsReporting(false);
      }
    } catch (err) {
      setToastMsg('제보 전송에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareToKakao = (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    if (!store || !(window as any).Kakao) return;
    
    (window as any).Kakao.Share.sendDefault({
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
      buttons: [
        {
          title: '지도에서 보기',
          link: {
            mobileWebUrl: `https://24hnow.vercel.app/?store=${store.id}`,
            webUrl: `https://24hnow.vercel.app/?store=${store.id}`,
          },
        },
      ],
    });
  };

  const copyLink = (e: React.MouseEvent<HTMLElement>) => {
    tapEffect(e);
    const url = `https://24hnow.vercel.app/?store=${store?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMsg('공유 링크가 복사되었습니다! 🔗');
      toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
    });
  };

  return (
    <div className={`bottom-sheet ${store ? 'open' : ''}`} style={{ position: 'absolute' }}>
      {toastMsg && <div className="vote-toast">{toastMsg}</div>}
      <div className="drag-handle" onClick={onClose} />

      {store && (
        <div className="sheet-content">
          {!isReporting ? (
            /* Normal Mode */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 className="title-1" style={{ marginBottom: '4px', letterSpacing: '-0.5px' }}>{store.name}</h2>
                  <p className="caption" style={{ color: 'var(--text-secondary)' }}>
                    {store.category} · {store.road_address}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={`badge ${store.class_type === 'A' ? 'badge-verified' : 'badge-warning'}`} style={{ padding: '6px 12px', borderRadius: '20px' }}>
                    {store.class_type === 'A' ? <><span className="status-dot" />운영 중</> : '정보 확인 중'}
                  </div>
                </div>
              </div>

              {/* Share & Copy Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button 
                  className="ios-button" 
                  style={{ flex: 1, background: '#FEE500', color: '#191919', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={shareToKakao}
                >
                  <span style={{ fontSize: '16px' }}>💬</span> 카톡 공유
                </button>
                <button 
                  className="ios-button" 
                  style={{ flex: 1, background: 'rgba(255,255,255,0.1)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={copyLink}
                >
                  <span style={{ fontSize: '16px' }}>🔗</span> 링크 복사
                </button>
              </div>

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
                      if (parts) return <p key={i}>{parts[1]}: {formatApiTime(parts[2])} - {formatApiTime(parts[3])}</p>;
                      return <p key={i}>{h}</p>;
                    })}
                  </div>
                )}

                {store.class_type !== 'A' && !hasVoted && (
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button className="ios-button" style={{ flex: 1, padding: '8px', fontSize: '13px', background: 'rgba(48,209,88,0.15)', color: '#30D158' }} onClick={(e) => handleVote(e, '24시간 운영')}>24시 맞아요 👍</button>
                    <button className="ios-button" style={{ flex: 1, padding: '8px', fontSize: '13px', background: 'rgba(255,69,58,0.15)', color: '#FF453A' }} onClick={() => setIsReporting(true)}>아니에요 👎</button>
                  </div>
                )}
              </div>

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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {tag}
                        {(votes[tag] ?? 0) > 0 && <span style={{ opacity: 0.6, fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px' }}>{votes[tag]}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="ios-button" style={{ flex: 1, background: 'var(--tertiary-bg)' }} onClick={onClose}>닫기</button>
                <button className="ios-button primary" style={{ flex: 2 }} onClick={openDirections}>길찾기</button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px', opacity: 0.6, cursor: 'pointer' }} onClick={() => setIsReporting(true)}>정보가 다른가요? 수정 제보하기</p>
            </>
          ) : (
            /* Reporting Mode */
            <div className="reporting-form" style={{ animation: 'fade-in 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="title-1">정보 수정 제보</h2>
                <button className="caption" style={{ background: 'none', border: 'none', color: 'var(--accent-blue)' }} onClick={() => setIsReporting(false)}>취소</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {[
                  { id: 'NOT_24H', label: '24시간 운영이 아니에요' },
                  { id: 'CLOSED', label: '장소가 존재하지 않아요' },
                  { id: 'OTHER', label: '기타 정보가 잘못되었어요' }
                ].map((opt) => (
                  <div 
                    key={opt.id}
                    onClick={() => setReportType(opt.id)}
                    style={{ 
                      padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                      border: reportType === opt.id ? '1.5px solid var(--accent-blue)' : '1.5px solid transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
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
                  style={{ 
                    width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)',
                    border: 'none', color: 'white', fontSize: '15px', outline: 'none'
                  }}
                />
              </div>

              <button 
                className={`ios-button primary ${!reportType || isSubmitting ? 'disabled' : ''}`} 
                style={{ width: '100%' }}
                disabled={!reportType || isSubmitting}
                onClick={handleReport}
              >
                {isSubmitting ? '전송 중...' : '제보 보내기'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
