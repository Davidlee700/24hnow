'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Store {
  id: string;
  name: string;
  category: string;
  road_address?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nearbyStores: Store[]; // List of stores available to select if no initial store is provided
  initialStore?: Store | null; // Pre-selected store if opened from detail page
  onSuccess?: () => void;
}

const TAGS = ['콘센트 많음', '자리 넉넉함', '사람 없음', '주차 가능', '디저트 맛집', '화장실 깨끗함', '에어컨 빵빵', '친절해요'];

export default function FeedPostModal({ isOpen, onClose, nearbyStores, initialStore, onSuccess }: Props) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStore?.id || '');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState('');

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 3) // Max 3 tags
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) {
      alert('매장을 먼저 선택해주세요.');
      return;
    }
    if (!content.trim() && selectedTags.length === 0) {
      alert('리뷰 내용이나 태그를 하나 이상 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStoreId,
          user_id: null, // Anonymous
          author_name: authorName.trim() || '익명 밤샘러',
          content: content.trim(),
          selected_tags: selectedTags,
        }),
      });

      if (res.ok) {
        setContent('');
        setSelectedTags([]);
        setSelectedStoreId('');
        setAuthorName('');
        onSuccess?.();
        onClose();
      } else {
        const errorData = await res.json();
        alert(`오류가 발생했습니다: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Failed to post feed:', err);
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--material-thin)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            border: '0.5px solid var(--border-light)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            color: 'var(--text-primary)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>실시간 피드 작성</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Store Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                어떤 매장에 대한 제보인가요? <span style={{color: 'var(--red)'}}>*</span>
              </label>
              {initialStore ? (
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border-light)', fontSize: '15px', fontWeight: 500 }}>
                  {initialStore.name} <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>({initialStore.category})</span>
                </div>
              ) : (
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border-light)',
                    color: 'var(--text-primary)', fontSize: '15px', outline: 'none',
                    appearance: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="" disabled style={{ color: '#999' }}>현재 주변 매장을 선택해주세요</option>
                  {nearbyStores.slice(0, 30).map(store => (
                    <option key={store.id} value={store.id} style={{ color: '#000' }}>
                      [{store.category}] {store.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Author Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                닉네임 (선택)
              </label>
              <input
                type="text"
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="익명 밤샘러"
                maxLength={20}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border-extra-light)',
                  color: 'var(--text-primary)', fontSize: '15px', outline: 'none',
                }}
              />
            </div>

            {/* Tags */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                태그 선택 (최대 3개)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', fontSize: '13px',
                        border: '0.5px solid',
                        borderColor: isSelected ? 'var(--accent-brand)' : 'rgba(255,255,255,0.15)',
                        background: isSelected ? 'rgba(0,122,255,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isSelected ? 'var(--accent-brand)' : 'var(--text-primary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                상세 내용 (선택)
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="다른 사람들에게 도움이 될 만한 현장 상황을 자유롭게 남겨주세요."
                rows={3}
                maxLength={500}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)', border: '0.5px solid var(--border-extra-light)',
                  color: 'var(--text-primary)', fontSize: '15px', outline: 'none', resize: 'none',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !selectedStoreId || (!content.trim() && selectedTags.length === 0)}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', marginTop: '8px',
                background: (selectedStoreId && (content.trim() || selectedTags.length > 0)) ? 'var(--accent-brand)' : 'rgba(255,255,255,0.1)',
                color: (selectedStoreId && (content.trim() || selectedTags.length > 0)) ? '#000' : 'var(--text-tertiary)',
                border: 'none', fontSize: '16px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {isSubmitting ? '등록 중...' : '피드 등록하기'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
