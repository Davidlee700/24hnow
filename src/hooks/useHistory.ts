'use client';

import { useState, useCallback, useEffect } from 'react';

export type HistoryItem = { id: string; name: string; category: string };

const KEY = 'store_history_v1';
const MAX = 5;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => {
      const next = [item, ...prev.filter(h => h.id !== item.id)].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { history, addToHistory };
}
