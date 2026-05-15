'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { HistoryItem } from '@/hooks/useHistory';

const EMOJI: Record<string, string> = {
  카페: '☕', 편의점: '🏪', 셀프세차장: '🚗', PC방: '🎮',
  약국: '💊', 코인노래방: '🎤', 셀프빨래방: '🫧', 찜질방: '🛁',
};

interface Props {
  items: HistoryItem[];
}

export default function RecentStores({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <motion.div
      className="recent-stores-wrap"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <p className="recent-stores-label">다시 찾기</p>
      <div className="recent-stores-scroll">
        {items.map(item => (
          <Link key={item.id} href={`/?store=${item.id}`} className="recent-store-card">
            <span className="recent-store-emoji">{EMOJI[item.category] ?? '📍'}</span>
            <span className="recent-store-name">{item.name}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
