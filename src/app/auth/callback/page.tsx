'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  const syncProfile = async (user: User) => {
    await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '이용자',
      avatar_url: user.user_metadata?.avatar_url || '',
    });
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncProfile(session.user).then(() => router.push('/'));
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await syncProfile(session.user);
        router.push('/');
      }
    });

    // Fallback redirect after a timeout if state doesn't change
    const timeout = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="loading-overlay">
      <div className="loading-spinner-wrapper">
        <div className="loading-logo">
          24시 <span style={{ color: 'var(--accent-neon)' }}>나우</span>
        </div>
        <div className="loading-pulse-dot" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '16px' }}>로그인 중입니다...</p>
      </div>
    </div>
  );
}
