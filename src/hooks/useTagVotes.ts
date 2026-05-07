'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const CATEGORY_TAGS: Record<string, string[]> = {
  '카페':       ['무인카페', '만화카페', '대형카페', '카공하기좋은', '대화하기좋은', '콘센트많음', '디저트맛집', '조용한', '주차가능'],
  '편의점':     ['넓은취식공간', '상비약완비', '택배가능', '주차가능', '무인편의점'],
  'PC방':       ['고사양PC', '프리미엄석', '커플석', '음식맛집', '프린트가능', '주차가능'],
  '셀프세차장': ['온수세차', '하부세차', '개인폼랜스', '실내게러지', '카페운영'],
  '코인노래방': ['카드결제가능', '넓은방', '음향좋음', '쾌적한시설', '주차가능'],
  '셀프빨래방': ['대형세탁기', '운동화세탁', '카드결제가능', '무인카페운영', '건조기완비'],
  '약국':       ['심야처방', '동물약취급', '상비약', '친절한상담', '주차가능'],
};

export function useTagVotes(storeId: string | null, category: string) {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [votedTag, setVotedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    setVotes({});
    const stored = localStorage.getItem(`voted_${storeId}`);
    setHasVoted(!!stored);
    setVotedTag(stored ?? null);
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
    setVotedTag(tag);
    localStorage.setItem(`voted_${storeId}`, tag);

    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, tag }),
    });

    if (!res.ok) {
      // Revert optimistic update on failure
      setVotes(prev => ({ ...prev, [tag]: Math.max(0, (prev[tag] || 1) - 1) }));
      setHasVoted(false);
      setVotedTag(null);
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
    votedTag,
    loading,
    tags: CATEGORY_TAGS[category] ?? [],
  };
}
