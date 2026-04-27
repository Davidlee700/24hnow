'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Store, MapBounds } from '@/types/store';

export function useStores(bounds: MapBounds | null, category: string) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportedStores, setReportedStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!bounds) return;
    setLoading(true);

    let query = supabase
      .from('stores')
      .select('*')
      .gte('latitude', bounds.sw.lat)
      .lte('latitude', bounds.ne.lat)
      .gte('longitude', bounds.sw.lng)
      .lte('longitude', bounds.ne.lng);

    if (category !== '전체') {
      query = query.eq('category', category);
    }

    query
      .order('trust_score', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) {
          const deduped = (data as Store[]).filter((store, idx) =>
            !data.slice(0, idx).some(
              prev =>
                prev.name === store.name &&
                Math.abs(prev.latitude - store.latitude) < 0.0005 &&
                Math.abs(prev.longitude - store.longitude) < 0.0005
            )
          );
          setStores(deduped);
        }
        setLoading(false);
      });
  }, [bounds, category]);

  async function reportStore(storeId: string, report: 'open' | 'closed') {
    if (reportedStores.has(storeId)) return;

    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    const delta = report === 'open' ? 10 : -30;
    const newScore = Math.max(0, Math.min(100, store.trust_score + delta));

    await supabase
      .from('stores')
      .update({ trust_score: newScore, last_verified_at: new Date().toISOString() })
      .eq('id', storeId);

    setStores(prev =>
      prev.map(s => s.id === storeId ? { ...s, trust_score: newScore } : s)
    );
    setReportedStores(prev => new Set(prev).add(storeId));
  }

  return { stores, loading, reportedStores, reportStore };
}
