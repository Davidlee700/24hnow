'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface BookmarkedStore {
  store_id: string;
  name: string;
  category: string;
  road_address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkedStore[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchBookmarks = useCallback(async () => {
    if (!user) { setBookmarks([]); setBookmarkedIds(new Set()); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('bookmarks')
      .select('store_id, name, category, road_address, latitude, longitude, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookmarks(data as BookmarkedStore[]);
      setBookmarkedIds(new Set(data.map(b => b.store_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const isBookmarked = (storeId: string) => bookmarkedIds.has(storeId);

  const toggleBookmark = async (store: {
    id: string;
    name: string;
    category: string;
    road_address: string;
    latitude: number;
    longitude: number;
  }): Promise<{ success: boolean; added: boolean; needsLogin: boolean }> => {
    if (!user) return { success: false, added: false, needsLogin: true };

    const alreadySaved = bookmarkedIds.has(store.id);

    // Optimistic update
    if (alreadySaved) {
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(store.id); return s; });
      setBookmarks(prev => prev.filter(b => b.store_id !== store.id));
    } else {
      setBookmarkedIds(prev => new Set(prev).add(store.id));
      setBookmarks(prev => [{
        store_id: store.id,
        name: store.name,
        category: store.category,
        road_address: store.road_address,
        latitude: store.latitude,
        longitude: store.longitude,
        created_at: new Date().toISOString(),
      }, ...prev]);
    }

    if (alreadySaved) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', store.id);

      if (error) {
        // Revert
        setBookmarkedIds(prev => new Set(prev).add(store.id));
        setBookmarks(prev => [...prev, {
          store_id: store.id, name: store.name, category: store.category,
          road_address: store.road_address, latitude: store.latitude,
          longitude: store.longitude, created_at: new Date().toISOString(),
        }]);
        return { success: false, added: false, needsLogin: false };
      }
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          store_id: store.id,
          name: store.name,
          category: store.category,
          road_address: store.road_address,
          latitude: store.latitude,
          longitude: store.longitude,
        });

      if (error) {
        // Revert
        setBookmarkedIds(prev => { const s = new Set(prev); s.delete(store.id); return s; });
        setBookmarks(prev => prev.filter(b => b.store_id !== store.id));
        return { success: false, added: true, needsLogin: false };
      }
    }

    return { success: true, added: !alreadySaved, needsLogin: false };
  };

  return { bookmarks, isBookmarked, toggleBookmark, user, loading, refetch: fetchBookmarks };
}
