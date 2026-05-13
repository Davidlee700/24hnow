'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  user: User | null;
}

export default function MenuDrawer({ isOpen, onClose, onShowToast, user }: Props) {
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      onShowToast('로그인에 실패했어요. 다시 시도해 주세요.');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      onShowToast('로그아웃에 실패했어요.');
    } else {
      onShowToast('로그아웃 되었어요.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="menu-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) onClose();
            }}
          >
            <div className="menu-drag-handle" />

            {user ? (
              <div className="menu-profile">
                <div className="profile-info">
                  <div className="profile-name">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || '이용자'}님
                  </div>
                  <div className="profile-email">{user.email}</div>
                </div>
                <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
              </div>
            ) : (
              <div style={{ padding: '0 8px 16px' }}>
                <div className="login-hint">나만의 취향이 담긴 아지트를 저장해보세요 🪄</div>
                <button className="kakao-login-btn" onClick={handleLogin}>
                  <svg className="kakao-logo-svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.712 4.8 4.37 6.04-.19.643-.69 2.338-.79 2.697-.13.483.17.478.36.35.15-.1.2.14 2.89-1.883.71.1 1.45.15 2.16.15 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
                  </svg>
                  <span>카카오로 로그인</span>
                </button>
              </div>
            )}
            <a href="/bookmarks" className="menu-item" onClick={onClose} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span>내 아지트</span>
              <span className="menu-chevron">›</span>
            </a>
            <a href="/guide" className="menu-item" onClick={onClose} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span>심야 가이드</span>
              <span className="menu-chevron">›</span>
            </a>
            <div className="menu-divider" style={{ margin: '16px 0 8px' }} />

            <div className="menu-footer">
              <a href="/notice" target="_blank" rel="noopener noreferrer">공지사항</a>
              <span className="footer-dot">·</span>
              <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a>
              <span className="footer-dot">·</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700 }}>개인정보처리방침</a>
              <span className="footer-dot">·</span>
              <a href="/contact" target="_blank" rel="noopener noreferrer">문의하기</a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
