'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export default function MenuDrawer({ isOpen, onClose, onShowToast }: Props) {
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

            <div className="menu-item" onClick={onClose}>
              <span>로그인 / 내 프로필</span>
              <span className="menu-chevron">›</span>
            </div>
            <div className="menu-item" onClick={() => { onClose(); onShowToast('나만의 아지트 저장 기능을 열심히 만들고 있어요 🪄'); }}>
              <span>내 아지트</span>
              <span className="coming-soon">준비 중</span>
            </div>
            <div className="menu-item" onClick={() => { onClose(); onShowToast('심야 가이드를 열심히 만들고 있어요 🪄'); }}>
              <span>심야 가이드</span>
              <span className="coming-soon">준비 중</span>
            </div>
            <div className="menu-item" onClick={() => { onClose(); onShowToast('제휴 및 수정 문의는 준비 중이에요. 곧 만나요! 🪄'); }}>
              <span>제휴 및 수정 문의</span>
              <span className="menu-chevron">›</span>
            </div>

            <div className="menu-divider" style={{ margin: '16px 0 8px' }} />

            <div className="menu-footer">
              <a href="/notice" target="_blank" rel="noopener noreferrer">공지사항</a>
              <span className="footer-dot">·</span>
              <a href="/terms" target="_blank" rel="noopener noreferrer">이용약관</a>
              <span className="footer-dot">·</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>
              <span className="footer-dot">·</span>
              <a href="/contact" target="_blank" rel="noopener noreferrer">문의하기</a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
