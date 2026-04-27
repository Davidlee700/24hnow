import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { store_id, tag } = await req.json();

  if (!store_id || !tag) {
    return NextResponse.json({ error: 'Missing store_id or tag' }, { status: 400 });
  }

  // Get client IP (hashed for privacy — raw IP is never stored)
  const rawIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0';
  const ip_hash = createHash('sha256').update(rawIp).digest('hex');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check for same IP vote on this store+tag today
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('store_votes')
    .select('id')
    .eq('store_id', store_id)
    .eq('tag', tag)
    .eq('ip_hash', ip_hash)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already voted today' }, { status: 409 });
  }

  const { error } = await supabase
    .from('store_votes')
    .insert({ store_id, tag, ip_hash });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '소중한 정보를 공유해 주셔서 감사해요. 덕분에 누군가의 밤이 더 편안해졌어요.',
  });
}
