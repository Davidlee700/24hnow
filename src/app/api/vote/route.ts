import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`vote:${getIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const { store_id, tag, user_id } = await req.json();

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

  // Insert vote directly (relying on client-side state for basic duplicate prevention)
  const { error } = await supabase
    .from('store_votes')
    .insert({ store_id, tag, ip_hash, user_id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '소중한 정보를 공유해 주셔서 감사해요. 덕분에 누군가의 밤이 더 편안해졌어요.',
  });
}
