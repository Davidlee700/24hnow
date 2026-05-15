'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES: { range: [number, number]; text: string }[] = [
  { range: [22, 24], text: '밤이 깊어지고 있어요. 지금 열린 곳을 찾아드릴게요.' },
  { range: [0, 1],  text: '자정이 넘었어요. 지금도 열려 있는 곳이 있어요.' },
  { range: [1, 2],  text: '새벽 한 시. 아직 문 열린 곳, 여기 있어요.' },
  { range: [2, 4],  text: '새벽에도 24시나우와 함께라면 걱정 없어요.' },
  { range: [4, 6],  text: '이른 새벽, 지금 영업 중인 곳을 찾아드릴게요.' },
];

function getMsg(hour: number): string {
  for (const m of MESSAGES) {
    const [a, b] = m.range;
    if (hour >= a && hour < b) return m.text;
  }
  return '';
}

const TODAY_KEY = 'night_banner_shown_date';

export default function NightBanner() {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    const isNight = hour >= 22 || hour < 6;
    if (!isNight) return;

    const today = new Date().toDateString();
    if (localStorage.getItem(TODAY_KEY) === today) return;

    const text = getMsg(hour);
    if (!text) return;

    setMsg(text);
    setVisible(true);
    localStorage.setItem(TODAY_KEY, today);

    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={() => setVisible(false)}
          style={{
            position: 'absolute',
            top: 'calc(var(--top-bar-height, 108px) + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            background: 'rgba(10, 10, 15, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '0.5px solid rgba(173, 255, 47, 0.25)',
            borderRadius: '20px',
            padding: '9px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 18px rgba(173, 255, 47, 0.08)',
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-neon)',
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {msg}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
