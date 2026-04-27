'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const CATEGORY_TAGS: Record<string, string[]> = {
  '카페':       ['몰입을 돕는 분위기', '여유로운 충전 환경', '편리한 주차', '뛰어난 커피 풍미'],
  '편의점':     ['쾌적한 취식 공간', '상비약 완비', '편리한 주차', '실속 있는 혜택'],
  '셀프세차장': ['완벽한 조명', '최신식 설비', '사계절 온수', '하부 세차 가능', '프라이빗 베이'],
  '약국':       ['지금 조제 가능', '아이 상비약', '병원 근접'],
};

export function useTagVotes(storeId: string | null, category: string) {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    setVotes({});
    setHasVoted(!!localStorage.getItem(`voted_${storeId}`));
    setLoading(true);

    supabase
      .from('store_votes')
      .select('tag')
      .eq('store_id', storeId)
      .then(({ data }) => {
        if (data) {
          const counts: Record<string, number> = {};
          data.forEach(row => { counts[row.tag] = (counts[row.tag] || 0) + 1; });
          setVotes(counts);
        }
        setLoading(false);
      });
  }, [storeId]);

  async function vote(tag: string): Promise<string | null> {
    if (!storeId || hasVoted) return null;

    // Optimistic update
    setVotes(prev => ({ ...prev, [tag]: (prev[tag] || 0) + 1 }));
    setHasVoted(true);
    localStorage.setItem(`voted_${storeId}`, '1');

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, tag }),
    });

    if (!res.ok) {
      // Revert optimistic update on failure
      setVotes(prev => ({ ...prev, [tag]: Math.max(0, (prev[tag] || 1) - 1) }));
      setHasVoted(false);
      localStorage.removeItem(`voted_${storeId}`);
      return null;
    }

    const data = await res.json();
    return data.message ?? null;
  }

  return {
    votes,
    vote,
    hasVoted,
    loading,
    tags: CATEGORY_TAGS[category] ?? [],
  };
}
