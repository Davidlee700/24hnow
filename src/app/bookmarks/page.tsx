'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBookmarks } from '@/hooks/useBookmarks';
import { supabase } from '@/lib/supabase';
import type { AjitrFolder } from '@/types/store';

const CATEGORY_EMOJI: Record<string, string> = {
  '카페': '☕', '편의점': '🏪', '셀프세차장': '🚗', 'PC방': '🎮', '약국': '💊',
  '코인노래방': '🎤', '셀프빨래방': '🧺',
};
const FOLDER_EMOJIS = ['⭐', '❤️', '🔥', '🎯', '🌙', '☕', '🍜', '🎮', '🏃', '💊'];

export default function BookmarksPage() {
  const router = useRouter();
  const {
    folders, activeFolderId, setActiveFolderId, bookmarks,
    isBookmarked, toggleBookmark, addToFolder,
    createFolder, deleteFolder, renameFolder,
    enableSharing, disableSharing, regenerateToken, getShareUrl, getBookmarkCountForFolder,
    user, loading,
  } = useBookmarks();

  // 폴더 생성 시트
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('⭐');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 폴더 액션 시트
  const [actionFolder, setActionFolder] = useState<AjitrFolder | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 공유 시트
  const [shareFolder, setShareFolder] = useState<AjitrFolder | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // 이름 변경 시트
  const [renameFolder_, setRenameFolder] = useState<AjitrFolder | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameEmoji, setRenameEmoji] = useState('⭐');

  // 삭제 확인
  const [deleteTargetFolder, setDeleteTargetFolder] = useState<AjitrFolder | null>(null);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleRemove = async (storeId: string, name: string, category: string, road_address: string, latitude: number, longitude: number) => {
    await toggleBookmark({ id: storeId, name, category, road_address, latitude, longitude });
  };

  // 폴더 탭 길게 누르기
  const handleFolderPressStart = (folder: AjitrFolder) => {
    longPressTimer.current = setTimeout(() => setActionFolder(folder), 500);
  };
  const handleFolderPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // 폴더 생성
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) { setCreateError('폴더 이름을 입력해주세요'); return; }
    setCreating(true);
    const result = await createFolder(newFolderName.trim(), newFolderEmoji);
    setCreating(false);
    if (result.success) {
      setShowCreateSheet(false); setNewFolderName(''); setNewFolderEmoji('⭐'); setCreateError('');
    } else {
      setCreateError(result.error ?? '폴더 생성에 실패했어요');
    }
  };

  // 공유 시트 열기
  const openShareSheet = (folder: AjitrFolder) => {
    setShareFolder(folder);
    setShareUrl(getShareUrl(folder));
    setShowDisableConfirm(false);
    setShowRegenConfirm(false);
    setCopied(false);
  };

  // 공유 켜기
  const handleEnableSharing = async () => {
    if (!shareFolder) return;
    setSharingLoading(true);
    const url = await enableSharing(shareFolder.id);
    setSharingLoading(false);
    if (url) {
      setShareUrl(url);
      setShareFolder(prev => prev ? { ...prev, is_public: true } : null);
    }
  };

  // 링크 복사
  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 카카오 공유
  const handleKakaoShare = () => {
    if (!shareUrl || !shareFolder) return;
    const count = getBookmarkCountForFolder(shareFolder.id);
    const kakao = (window as any).Kakao;
    if (kakao?.Share) {
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${shareFolder.emoji} ${shareFolder.name} — 나의 아지트`,
          description: `${count}개의 장소가 담긴 아지트를 공유했어요. 24시나우에서 확인해보세요.`,
          imageUrl: 'https://24now.kr/og-image.png',
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      });
    } else {
      handleCopy();
    }
  };

  // 공유 중단
  const handleDisableSharing = async () => {
    if (!shareFolder) return;
    setSharingLoading(true);
    await disableSharing(shareFolder.id);
    setSharingLoading(false);
    setShareUrl(null);
    setShareFolder(prev => prev ? { ...prev, is_public: false, share_token: null } : null);
    setShowDisableConfirm(false);
  };

  // 새 링크 발급
  const handleRegenerate = async () => {
    if (!shareFolder) return;
    setSharingLoading(true);
    const url = await regenerateToken(shareFolder.id);
    setSharingLoading(false);
    setShareUrl(url);
    setShowRegenConfirm(false);
    setCopied(false);
  };

  // 이름 변경 저장
  const handleRename = async () => {
    if (!renameFolder_ || !renameName.trim()) return;
    await renameFolder(renameFolder_.id, renameName.trim(), renameEmoji);
    setRenameFolder(null);
  };

  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '56px 20px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => router.back()} aria-label="뒤로가기" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none"><path d="M8 2L2 8L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>내 아지트</h1>
      </div>

      {!user ? (
        /* 비로그인 */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '80px 20px', textAlign: 'center' }}>
          <span style={{ fontSize: '48px' }}>🔒</span>
          <div>
            <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 6px' }}>로그인이 필요해요</p>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>저장한 아지트를 확인하려면<br/>카카오 로그인이 필요해요</p>
          </div>
          <button onClick={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: '#FEE500', color: '#000', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            카카오로 로그인
          </button>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>불러오는 중...</div>
        </div>
      ) : (
        <>
          {/* 폴더 탭 바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {folders.map(folder => {
              const count = getBookmarkCountForFolder(folder.id);
              const isActive = folder.id === activeFolderId;
              const isSharing = folder.is_public;
              return (
                <button
                  key={folder.id}
                  onMouseDown={() => handleFolderPressStart(folder)}
                  onMouseUp={handleFolderPressEnd}
                  onTouchStart={() => handleFolderPressStart(folder)}
                  onTouchEnd={handleFolderPressEnd}
                  onClick={() => setActiveFolderId(folder.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '20px', flexShrink: 0,
                    border: isActive ? '1.5px solid var(--accent-brand)' : '1px solid rgba(255,255,255,0.12)',
                    background: isActive ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? 'var(--accent-brand)' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: isActive ? '600' : '400', cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <span>{folder.emoji}</span>
                  <span>{folder.name}</span>
                  {count > 0 && <span style={{ fontSize: '11px', opacity: 0.7 }}>{count}</span>}
                  {isSharing && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#32D74B', position: 'absolute', top: '4px', right: '4px' }} />
                  )}
                </button>
              );
            })}
            {/* 폴더 추가 버튼 */}
            {folders.length < 5 && (
              <button
                onClick={() => setShowCreateSheet(true)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: '18px', cursor: 'pointer', flexShrink: 0 }}
              >+</button>
            )}
          </div>

          {/* 공유 중 배너 */}
          {activeFolder?.is_public && (
            <div
              onClick={() => openShareSheet(activeFolder)}
              style={{ margin: '0 16px 8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(50,215,75,0.1)', border: '0.5px solid rgba(50,215,75,0.3)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#32D74B', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#32D74B', flex: 1 }}>이 폴더는 공유 중이에요</span>
              <span style={{ fontSize: '12px', color: 'rgba(50,215,75,0.7)' }}>관리 →</span>
            </div>
          )}

          {/* 북마크 목록 */}
          <div style={{ padding: '4px 16px 20px', maxWidth: '480px', margin: '0 auto' }}>
            {bookmarks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 20px', textAlign: 'center' }}>
                <span style={{ fontSize: '48px' }}>🤍</span>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 6px' }}>이 폴더는 비어있어요</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>지도에서 마음에 드는 장소를<br/>아지트에 저장해보세요</p>
                </div>
                <button onClick={() => router.push('/')} style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--accent-brand)', color: '#ffffff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
                  지도로 돌아가기
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bookmarks.map(b => (
                  <div key={b.store_id} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    onClick={() => router.push(`/?store=${b.store_id}`)}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {CATEGORY_EMOJI[b.category] ?? '📍'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.road_address}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleRemove(b.store_id, b.name, b.category, b.road_address, b.latitude, b.longitude); }} aria-label="저장 취소" style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                      🧡
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 폴더 공유 버튼 (공유 안 중인 경우) */}
            {bookmarks.length > 0 && !activeFolder?.is_public && activeFolder && (
              <button
                onClick={() => openShareSheet(activeFolder)}
                style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span>🔗</span> 이 폴더 공유하기
              </button>
            )}
          </div>
        </>
      )}

      {/* ── 폴더 액션 시트 ── */}
      {actionFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setActionFolder(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--glass-bg)', borderRadius: '20px 20px 0 0', padding: '8px 0 32px', backdropFilter: 'blur(40px)' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '8px auto 16px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', margin: '0 0 8px' }}>
              {actionFolder.emoji} {actionFolder.name}
            </p>
            {[
              { label: '이름 변경', onClick: () => { setRenameFolder(actionFolder); setRenameName(actionFolder.name); setRenameEmoji(actionFolder.emoji); setActionFolder(null); } },
              { label: actionFolder.is_public ? '공유 관리' : '이 폴더 공유하기', onClick: () => { openShareSheet(actionFolder); setActionFolder(null); } },
              ...(folders[0]?.id !== actionFolder.id ? [{ label: '폴더 삭제', danger: true, onClick: () => { setDeleteTargetFolder(actionFolder); setActionFolder(null); } }] : []),
            ].map(item => (
              <button key={item.label} onClick={item.onClick} style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.06)', color: (item as any).danger ? '#FF453A' : 'var(--text-primary)', fontSize: '16px', cursor: 'pointer', textAlign: 'left' }}>
                {item.label}
              </button>
            ))}
            <button onClick={() => setActionFolder(null)} style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.06)', color: 'var(--text-tertiary)', fontSize: '16px', cursor: 'pointer', textAlign: 'left' }}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 폴더 생성 시트 ── */}
      {showCreateSheet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCreateSheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--glass-bg)', borderRadius: '20px 20px 0 0', padding: '8px 20px 40px', backdropFilter: 'blur(40px)' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '8px auto 20px' }} />
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 20px' }}>새 폴더</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {FOLDER_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewFolderEmoji(e)} style={{ width: '40px', height: '40px', borderRadius: '10px', border: newFolderEmoji === e ? '2px solid var(--accent-brand)' : '1px solid rgba(255,255,255,0.1)', background: newFolderEmoji === e ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', fontSize: '20px', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="폴더 이름"
              maxLength={20}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
            />
            {createError && <p style={{ color: '#FF453A', fontSize: '13px', margin: '0 0 8px' }}>{createError}</p>}
            <button onClick={handleCreateFolder} disabled={creating} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--accent-brand)', color: '#ffffff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
              {creating ? '생성 중...' : '만들기'}
            </button>
          </div>
        </div>
      )}

      {/* ── 이름 변경 시트 ── */}
      {renameFolder_ && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setRenameFolder(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--glass-bg)', borderRadius: '20px 20px 0 0', padding: '8px 20px 40px', backdropFilter: 'blur(40px)' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '8px auto 20px' }} />
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 20px' }}>폴더 이름 변경</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {FOLDER_EMOJIS.map(e => (
                <button key={e} onClick={() => setRenameEmoji(e)} style={{ width: '40px', height: '40px', borderRadius: '10px', border: renameEmoji === e ? '2px solid var(--accent-brand)' : '1px solid rgba(255,255,255,0.1)', background: renameEmoji === e ? 'rgba(0,122,255,0.1)' : 'rgba(255,255,255,0.04)', fontSize: '20px', cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
            <input
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              maxLength={20}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
            />
            <button onClick={handleRename} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--accent-brand)', color: '#ffffff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
              저장
            </button>
          </div>
        </div>
      )}

      {/* ── 공유 시트 ── */}
      {shareFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => { setShareFolder(null); setShowDisableConfirm(false); setShowRegenConfirm(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--glass-bg)', borderRadius: '20px 20px 0 0', padding: '8px 20px 44px', backdropFilter: 'blur(40px)' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '8px auto 20px' }} />
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 4px' }}>{shareFolder.emoji} {shareFolder.name} 공유</p>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
              {getBookmarkCountForFolder(shareFolder.id)}개의 아지트
            </p>

            {!shareFolder.is_public ? (
              /* 공유 안 함 상태 */
              <>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                  링크를 만들면 누구든 이 폴더를 지도에서 볼 수 있어요.<br/>언제든 공유를 중단할 수 있어요.
                </p>
                <button onClick={handleEnableSharing} disabled={sharingLoading} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--accent-brand)', color: '#ffffff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: sharingLoading ? 0.6 : 1 }}>
                  {sharingLoading ? '링크 생성 중...' : '링크 만들기'}
                </button>
              </>
            ) : showDisableConfirm ? (
              /* 공유 중단 확인 */
              <>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
                  공유를 중단하면 기존 링크가 즉시 무효화돼요.<br/>계속할까요?
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowDisableConfirm(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: 'none', fontSize: '16px', cursor: 'pointer' }}>취소</button>
                  <button onClick={handleDisableSharing} disabled={sharingLoading} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#FF453A', color: '#fff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: sharingLoading ? 0.6 : 1 }}>
                    {sharingLoading ? '처리 중...' : '공유 중단'}
                  </button>
                </div>
              </>
            ) : showRegenConfirm ? (
              /* 새 링크 확인 */
              <>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
                  기존 링크가 무효화되고 새 링크가 만들어져요.<br/>계속할까요?
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowRegenConfirm(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: 'none', fontSize: '16px', cursor: 'pointer' }}>취소</button>
                  <button onClick={handleRegenerate} disabled={sharingLoading} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'var(--accent-brand)', color: '#ffffff', border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', opacity: sharingLoading ? 0.6 : 1 }}>
                    {sharingLoading ? '처리 중...' : '새 링크 만들기'}
                  </button>
                </div>
              </>
            ) : (
              /* 공유 중 상태 */
              <>
                <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 4px' }}>공유 링크</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, wordBreak: 'break-all' }}>{shareUrl}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button onClick={handleCopy} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: copied ? 'rgba(50,215,75,0.15)' : 'rgba(255,255,255,0.08)', border: copied ? '0.5px solid rgba(50,215,75,0.4)' : 'none', color: copied ? '#32D74B' : 'var(--text-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                    {copied ? '복사됨 ✓' : '링크 복사'}
                  </button>
                  <button onClick={handleKakaoShare} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: '#FEE500', color: '#000', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                    카카오 공유
                  </button>
                </div>
                <button onClick={() => setShowRegenConfirm(true)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: 'var(--text-tertiary)', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}>
                  새 링크 만들기 (기존 링크 무효화)
                </button>
                <button onClick={() => setShowDisableConfirm(true)} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#FF453A', fontSize: '14px', cursor: 'pointer' }}>
                  공유 중단
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 폴더 삭제 확인 ── */}
      {deleteTargetFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setDeleteTargetFolder(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '320px', background: 'var(--glass-bg)', borderRadius: '20px', padding: '24px 20px', backdropFilter: 'blur(40px)' }}>
            <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px', textAlign: 'center' }}>폴더 삭제</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.5 }}>
              "{deleteTargetFolder.name}" 폴더를 삭제해요.<br/>저장된 아지트는 기본 폴더로 이동돼요.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeleteTargetFolder(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', border: 'none', fontSize: '15px', cursor: 'pointer' }}>취소</button>
              <button onClick={async () => { await deleteFolder(deleteTargetFolder.id); setDeleteTargetFolder(null); }} style={{ flex: 1, padding: '13px', borderRadius: '12px', background: '#FF453A', color: '#fff', border: 'none', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
