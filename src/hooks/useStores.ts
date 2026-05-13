'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Store, MapBounds } from '@/types/store';
import { isOpenNow } from '@/utils/openHours';

export function useStores(
  bounds: MapBounds | null,
  categories: string[],
  tagFilter?: string,
  openNowOnly?: boolean,
  medicineOnly?: boolean,
) {
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
      .not('operation_type', 'eq', 'UNKNOWN')  // 영업시간 미확인 매장은 표시 안 함
      .order('trust_score', { ascending: false })
      .limit(100);

    if (tagFilter) {
      query = query.contains('tags', [tagFilter]);
    }

    if (medicineOnly) {
      query = query.eq('has_medicine', true);
    }

    // "지금 영업중" 필터: DB에서 24H+EXTENDED+REGULAR 가져온 뒤 클라이언트에서 실시간 판단
    if (openNowOnly) {
      query = query.in('operation_type', ['24H', 'EXTENDED', 'REGULAR']);
    }

    query.then(({ data, error }) => {
      if (ignore) return;
      if (!error && data) {
        let result = (data as Store[]).filter((store, idx) =>
          !data.slice(0, idx).some(
            prev =>
              prev.name === store.name &&
              Math.abs(prev.latitude - store.latitude) < 0.0005 &&
              Math.abs(prev.longitude - store.longitude) < 0.0005
          )
        );

        if (openNowOnly) {
          const now = new Date();
          result = result.filter(store => isOpenNow(store, now) !== false);
        }

        setStores(result);
      } else if (error) {
        if (process.env.NODE_ENV === 'development') console.error('[useStores] fetch error:', error.message);
        setStores([]);
      }
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [bounds, categories.join(','), tagFilter ?? '', openNowOnly ?? false]);

  return { stores, loading };
}
