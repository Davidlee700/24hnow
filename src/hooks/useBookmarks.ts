'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { AjitrFolder } from '@/types/store';

export interface BookmarkedStore {
  store_id: string;
  folder_id: string | null;
  name: string;
  category: string;
  road_address: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

const MAX_FOLDERS = 5;
const MAX_PER_FOLDER = 100;

export function useBookmarks() {
  const [folders, setFolders] = useState<AjitrFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [allBookmarks, setAllBookmarks] = useState<BookmarkedStore[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchAllBookmarks = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('bookmarks')
      .select('store_id, folder_id, name, category, road_address, latitude, longitude, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) {
      setAllBookmarks(data as BookmarkedStore[]);
      setBookmarkedIds(new Set(data.map(b => b.store_id)));
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setFolders([]); setAllBookmarks([]); setBookmarkedIds(new Set()); return;
    }
    setLoading(true);

    // 폴더 조회 or 기본 폴더 생성
    const { data: existing } = await supabase
      .from('ajitr_folders').select('*').eq('user_id', user.id).order('sort_order');

    let flds: AjitrFolder[] = existing ?? [];
    if (flds.length === 0) {
      const { data: created } = await supabase
        .from('ajitr_folders')
        .insert({ user_id: user.id, name: '내 아지트', emoji: '⭐', sort_order: 0 })
        .select().single();
      if (created) flds = [created as AjitrFolder];
    }
    setFolders(flds);
    setActiveFolderId(prev => prev ?? flds[0]?.id ?? null);
    await fetchAllBookmarks(user.id);
    setLoading(false);
  }, [user, fetchAllBookmarks]);

  useEffect(() => { refresh(); }, [user]); // eslint-disable-line

  // 현재 폴더의 북마크 (기본 폴더는 folder_id=null인 구 데이터도 포함)
  const bookmarks = allBookmarks.filter(b => {
    if (!activeFolderId) return true;
    const isDefault = folders[0]?.id === activeFolderId;
    return isDefault
      ? (b.folder_id === activeFolderId || b.folder_id === null)
      : b.folder_id === activeFolderId;
  });

  const isBookmarked = (storeId: string) => bookmarkedIds.has(storeId);

  // 기본 저장 (현재 폴더에 추가, 또는 제거) — StoreBottomSheet 호환용
  const toggleBookmark = async (store: {
    id: string; name: string; category: string;
    road_address: string; latitude: number; longitude: number;
  }): Promise<{ success: boolean; added: boolean; needsLogin: boolean }> => {
    if (!user) return { success: false, added: false, needsLogin: true };

    if (bookmarkedIds.has(store.id)) {
      const prevIds = new Set(bookmarkedIds);
      const prevBms = [...allBookmarks];
      setBookmarkedIds(prev => { const s = new Set(prev); s.delete(store.id); return s; });
      setAllBookmarks(prev => prev.filter(b => b.store_id !== store.id));

      const { error } = await supabase.from('bookmarks')
        .delete().eq('user_id', user.id).eq('store_id', store.id);
      if (error) { setBookmarkedIds(prevIds); setAllBookmarks(prevBms); return { success: false, added: false, needsLogin: false }; }
      return { success: true, added: false, needsLogin: false };
    } else {
      const targetId = activeFolderId ?? folders[0]?.id ?? null;
      const count = allBookmarks.filter(b =>
        b.folder_id === targetId || (targetId === folders[0]?.id && b.folder_id === null)
      ).length;
      if (count >= MAX_PER_FOLDER) return { success: false, added: false, needsLogin: false };

      const newBm: BookmarkedStore = {
        store_id: store.id, folder_id: targetId, name: store.name, category: store.category,
        road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
        created_at: new Date().toISOString(),
      };
      setBookmarkedIds(prev => new Set(prev).add(store.id));
      setAllBookmarks(prev => [newBm, ...prev]);

      const { error } = await supabase.from('bookmarks').insert({
        user_id: user.id, store_id: store.id, folder_id: targetId,
        name: store.name, category: store.category,
        road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
      });
      if (error) {
        setBookmarkedIds(prev => { const s = new Set(prev); s.delete(store.id); return s; });
        setAllBookmarks(prev => prev.filter(b => b.store_id !== store.id));
        return { success: false, added: true, needsLogin: false };
      }
      return { success: true, added: true, needsLogin: false };
    }
  };

  // 특정 폴더에 저장 (폴더 선택 후 저장)
  const addToFolder = async (store: {
    id: string; name: string; category: string;
    road_address: string; latitude: number; longitude: number;
  }, folderId: string): Promise<{ success: boolean; needsLogin: boolean; limitReached: boolean }> => {
    if (!user) return { success: false, needsLogin: true, limitReached: false };
    const count = allBookmarks.filter(b => b.folder_id === folderId).length;
    if (count >= MAX_PER_FOLDER) return { success: false, needsLogin: false, limitReached: true };

    // 기존 다른 폴더에 있으면 제거 후 재저장
    if (bookmarkedIds.has(store.id)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('store_id', store.id);
    }

    const newBm: BookmarkedStore = {
      store_id: store.id, folder_id: folderId, name: store.name, category: store.category,
      road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
      created_at: new Date().toISOString(),
    };
    setBookmarkedIds(prev => new Set(prev).add(store.id));
    setAllBookmarks(prev => [newBm, ...prev.filter(b => b.store_id !== store.id)]);

    const { error } = await supabase.from('bookmarks').insert({
      user_id: user.id, store_id: store.id, folder_id: folderId,
      name: store.name, category: store.category,
      road_address: store.road_address, latitude: store.latitude, longitude: store.longitude,
    });
    if (error) { await fetchAllBookmarks(user.id); return { success: false, needsLogin: false, limitReached: false }; }
    return { success: true, needsLogin: false, limitReached: false };
  };

  // 폴더 생성
  const createFolder = async (name: string, emoji: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: '로그인이 필요해요' };
    if (folders.length >= MAX_FOLDERS) return { success: false, error: `폴더는 최대 ${MAX_FOLDERS}개까지 만들 수 있어요` };
    const { data, error } = await supabase.from('ajitr_folders')
      .insert({ user_id: user.id, name, emoji, sort_order: folders.length })
      .select().single();
    if (error || !data) return { success: false, error: '폴더 생성에 실패했어요' };
    setFolders(prev => [...prev, data as AjitrFolder]);
    return { success: true };
  };

  // 폴더 삭제 (기본 폴더 삭제 불가, 북마크는 기본 폴더로 이동)
  const deleteFolder = async (folderId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false };
    if (folders[0]?.id === folderId) return { success: false, error: '기본 폴더는 삭제할 수 없어요' };
    const defaultId = folders[0]?.id;
    if (defaultId) {
      await supabase.from('bookmarks').update({ folder_id: defaultId })
        .eq('user_id', user.id).eq('folder_id', folderId);
    }
    const { error } = await supabase.from('ajitr_folders').delete().eq('id', folderId).eq('user_id', user.id);
    if (error) return { success: false, error: '폴더 삭제에 실패했어요' };
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setActiveFolderId(prev => prev === folderId ? (folders[0]?.id ?? null) : prev);
    await fetchAllBookmarks(user.id);
    return { success: true };
  };

  // 폴더 이름/이모지 변경
  const renameFolder = async (folderId: string, name: string, emoji: string): Promise<void> => {
    if (!user) return;
    await supabase.from('ajitr_folders').update({ name, emoji }).eq('id', folderId).eq('user_id', user.id);
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name, emoji } : f));
  };

  // 공유 ON — 토큰 생성, URL 반환
  const enableSharing = async (folderId: string): Promise<string | null> => {
    if (!user) return null;
    const token = crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase.from('ajitr_folders')
      .update({ is_public: true, share_token: token }).eq('id', folderId).eq('user_id', user.id);
    if (error) return null;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, is_public: true, share_token: token } : f));
    return `${window.location.origin}/ajitr/${token}`;
  };

  // 공유 OFF
  const disableSharing = async (folderId: string): Promise<void> => {
    if (!user) return;
    await supabase.from('ajitr_folders').update({ is_public: false, share_token: null })
      .eq('id', folderId).eq('user_id', user.id);
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, is_public: false, share_token: null } : f));
  };

  // 링크 재발급 (기존 링크 무효화)
  const regenerateToken = async (folderId: string): Promise<string | null> => {
    if (!user) return null;
    const token = crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase.from('ajitr_folders')
      .update({ share_token: token }).eq('id', folderId).eq('user_id', user.id);
    if (error) return null;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, share_token: token } : f));
    return `${window.location.origin}/ajitr/${token}`;
  };

  const getShareUrl = (folder: AjitrFolder): string | null => {
    if (!folder.is_public || !folder.share_token) return null;
    if (typeof window === 'undefined') return null;
    return `${window.location.origin}/ajitr/${folder.share_token}`;
  };

  const getBookmarkCountForFolder = (folderId: string): number => {
    const isDefault = folders[0]?.id === folderId;
    return allBookmarks.filter(b =>
      isDefault ? (b.folder_id === folderId || b.folder_id === null) : b.folder_id === folderId
    ).length;
  };

  return {
    folders, activeFolderId, setActiveFolderId,
    bookmarks, allBookmarks, bookmarkedIds,
    isBookmarked, toggleBookmark, addToFolder,
    createFolder, deleteFolder, renameFolder,
    enableSharing, disableSharing, regenerateToken, getShareUrl,
    getBookmarkCountForFolder,
    user, loading, refetch: refresh,
  };
}
