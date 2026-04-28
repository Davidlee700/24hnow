'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  type: 'terms' | 'privacy';
  onClose: () => void;
}

const TERMS_CONTENT = {
  title: '서비스 이용약관',
  subtitle: '24시나우를 즐겁고 안전하게 이용하기 위한 약속이에요.',
  sections: [
    {
      id: 1,
      title: '1. 서비스의 목적',
      content: '언제 어디서나 필요할 때 쉴 수 있는 24시간 공간 정보를 제공해요. 카페, 편의점, 세차장, PC방, 약국 등 Max님이 필요한 공간을 쉽게 찾을 수 있도록 도와드려요.',
    },
    {
      id: 2,
      title: '2. Max님과의 약속',
      content: '정확한 정보를 드리기 위해 최선을 다할게요. 다만, 매장의 사정으로 영업 시간이 변경될 수 있으니 방문 전 확인해 주시면 좋아요.',
    },
    {
      id: 3,
      title: '3. 지켜주셔야 할 점',
      content: '다른 분들을 위해 허위 정보를 제보하거나 서비스를 악용하는 행동은 삼가 주세요.',
    },
  ],
};

const PRIVACY_CONTENT = {
  title: '개인정보처리방침',
  subtitle: 'Max님의 소중한 정보를 보호하기 위해 노력하고 있어요.',
  sections: [
    {
      id: 1,
      title: '1. 어떤 정보를 수집하나요?',
      content: 'Max님의 현재 위치 정보와 기기 정보를 수집해요. 주변의 24시 공간을 정확하게 찾아드리기 위함이에요.',
    },
    {
      id: 2,
      title: '2. 수집한 정보는 어떻게 활용되나요?',
      content: 'Max님께 딱 맞는 밤샘 공간을 추천해 드리고, 서비스 사용성을 개선하는 데에만 소중히 사용할게요.',
    },
    {
      id: 3,
      title: '3. 정보는 언제까지 보관하나요?',
      content: 'Max님이 서비스를 이용하시는 동안 안전하게 보관되며, 서비스 탈퇴나 요청 시 지체 없이 파기돼요.',
    },
  ],
};

export default function LegalModal({ isOpen, type, onClose }: Props) {
  const content = type === 'terms' ? TERMS_CONTENT : PRIVACY_CONTENT;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="legal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="legal-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="legal-header">
              <h2>{content.title}</h2>
              <p>{content.subtitle}</p>
              <button className="legal-close-btn" onClick={onClose} aria-label="닫기">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="legal-body">
              {content.sections.map(section => (
                <details key={section.id} className="legal-accordion">
                  <summary className="legal-summary">
                    {section.title}
                    <span className="legal-arrow">›</span>
                  </summary>
                  <div className="legal-content">
                    <p>{section.content}</p>
                  </div>
                </details>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
