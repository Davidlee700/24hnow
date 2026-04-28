'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export default function MenuDrawer({ isOpen, onClose, onOpenTerms, onOpenPrivacy }: Props) {
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
            <div className="menu-item" onClick={onClose}>
              <span>내 아지트</span>
              <span className="coming-soon">준비 중</span>
            </div>
            <div className="menu-item" onClick={onClose}>
              <span>심야 가이드</span>
              <span className="coming-soon">준비 중</span>
            </div>
            <div className="menu-item" onClick={onClose}>
              <span>제휴 및 수정 문의</span>
              <span className="menu-chevron">›</span>
            </div>

            <div className="menu-divider" style={{ margin: '8px 0' }} />

            <div className="menu-item legal" onClick={() => { onClose(); onOpenTerms(); }}>
              <span>이용약관</span>
              <span className="menu-chevron">›</span>
            </div>
            <div className="menu-item legal" onClick={() => { onClose(); onOpenPrivacy(); }}>
              <span>개인정보처리방침</span>
              <span className="menu-chevron">›</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
