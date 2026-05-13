'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Comment {
  id: string;
  author_name: string;
  content: string;
  selected_tags: string[];
  created_at: string;
}

interface Props {
  storeId: string;
  availableTags: string[];
  onLoad?: (count: number) => void;
  onVote?: (tag: string) => void;
  hasVoted?: boolean;
  votedTag?: string | null;
}

export default function StoreReviews({ storeId, availableTags, onLoad, onVote, hasVoted, votedTag }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?store_id=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        const loaded = data.comments ?? [];
        setComments(loaded);
        onLoad?.(loaded.length);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to fetch comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      setLoading(true);
      fetchComments();
    }
  }, [storeId]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const isSelecting = !prev.includes(tag);
      if (isSelecting && onVote && !hasVoted) {
        onVote(tag);
      }
      return isSelecting ? [...prev, tag] : prev.filter(t => t !== tag);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && selectedTags.length === 0) return;
    setIsSubmitting(true);

    try {
      const author_name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '익명 밤샘러';
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          user_id: user?.id ?? null,
          author_name,
          content: text.trim(),
          selected_tags: selectedTags,
        }),
      });

      if (res.ok) {
        setText('');
        setSelectedTags([]);
        fetchComments();
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Failed to post comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="store-reviews-section">
      <div className="confidence-divider" style={{ margin: '24px 0 16px' }} />
      
      <p className="community-label" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>💬 밤샘 리뷰</span>
        <span style={{ fontSize: '12px', color: 'var(--accent-neon)', background: 'rgba(173,255,47,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
          {comments.length}
        </span>
      </p>

      {/* 댓글 작성 폼 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '16px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>태그로 빠른 분위기 남기기</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {availableTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                type="button"
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  border: '0.5px solid',
                  borderColor: isSelected ? 'var(--accent-neon)' : 'rgba(255,255,255,0.15)',
                  background: isSelected ? 'rgba(173,255,47,0.15)' : 'rgba(255,255,255,0.06)',
                  color: isSelected ? 'var(--accent-neon)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', marginTop: '4px' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={user ? "다녀오신 후기를 들려주세요 (선택)" : "로그인 없이도 가볍게 한마디 남겨보세요! (선택)"}
            rows={2}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="submit"
              disabled={isSubmitting || (!text.trim() && selectedTags.length === 0)}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                background: (text.trim() || selectedTags.length > 0) ? 'var(--accent-neon)' : 'rgba(255,255,255,0.08)',
                color: (text.trim() || selectedTags.length > 0) ? '#000' : 'var(--text-tertiary)',
                border: 'none',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isSubmitting ? '등록 중...' : '리뷰 등록'}
            </button>
          </div>
        </div>
      </form>

      {/* 댓글 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px' }}>아직 리뷰가 없어요. 첫 리뷰를 남겨보세요!</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{comment.author_name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              
              {comment.selected_tags && comment.selected_tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                  {comment.selected_tags.map(t => (
                    <span key={t} style={{ fontSize: '11px', color: 'var(--accent-neon)', background: 'rgba(173,255,47,0.08)', padding: '2px 6px', borderRadius: '6px' }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {comment.content && (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
