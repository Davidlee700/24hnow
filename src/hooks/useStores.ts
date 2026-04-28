'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Store, MapBounds } from '@/types/store';

export function useStores(bounds: MapBounds | null, categories: string[], tagFilter?: string) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bounds || categories.length === 0) return;
    let ignore = false;
    setLoading(true);

    let query = supabase
      .from('stores')
      .select('*')
      .gte('latitude', bounds.sw.lat)
      .lte('latitude', bounds.ne.lat)
      .gte('longitude', bounds.sw.lng)
      .lte('longitude', bounds.ne.lng)
      .in('category', categories)
      .order('trust_score', { ascending: false })
      .limit(100);

    if (tagFilter) {
      query = query.contains('tags', [tagFilter]);
    }

    query.then(({ data, error }) => {
      if (ignore) return;
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
      } else if (error) {
        console.error('[useStores] fetch error:', error.message);
        setStores([]);
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [bounds, categories.join(','), tagFilter ?? '']);

  return { stores, loading };
}
