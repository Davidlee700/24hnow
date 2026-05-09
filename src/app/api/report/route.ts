import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getIp } from '@/lib/rate-limit';

// report_type → stores 업데이트 내용 매핑
const HOURS_TYPE_MAP: Record<string, { operation_type: string; inference_note: string }> = {
  OPEN_24H:            { operation_type: '24H',      inference_note: '유저 제보 2회 일치 — 24시간 영업' },
  OPEN_UNTIL_MIDNIGHT: { operation_type: 'REGULAR',  inference_note: '유저 제보 2회 일치 — 자정까지 영업' },
  OPEN_UNTIL_1AM:      { operation_type: 'EXTENDED', inference_note: '유저 제보 2회 일치 — 새벽 1시까지 영업' },
  OPEN_UNTIL_2AM:      { operation_type: 'EXTENDED', inference_note: '유저 제보 2회 일치 — 새벽 2시까지 영업' },
};

const THRESHOLD = 2;

export async function POST(req: NextRequest) {
  if (!rateLimit(`report:${getIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const { store_id, report_type, comment, session_id } = await req.json();

  if (!store_id || !report_type || !session_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. 제보 저장
  const { error: insertError } = await supabase
    .from('user_reports')
    .insert({
      store_id,
      session_id,
      report_type,
      comment: comment?.slice(0, 20),
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. 폐업 의심 — 2회 달성 시 관리자 확인 플래그
  if (report_type === 'CLOSED_PERMANENTLY') {
    const { count } = await supabase
      .from('user_reports')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .eq('report_type', 'CLOSED_PERMANENTLY');

    if ((count ?? 0) >= THRESHOLD) {
      await supabase
        .from('stores')
        .update({
          confidence_level: 'LOW',
          inference_note: '[폐업의심] 유저 2회 제보 — 관리자 확인 필요',
        })
        .eq('id', store_id);
    }
  }

  // 3. 영업시간 제보 — 2회 일치 시 자동 반영
  const hoursUpdate = HOURS_TYPE_MAP[report_type];
  if (hoursUpdate) {
    const { count } = await supabase
      .from('user_reports')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store_id)
      .eq('report_type', report_type);

    if ((count ?? 0) >= THRESHOLD) {
      await supabase
        .from('stores')
        .update({
          operation_type: hoursUpdate.operation_type,
          confidence_level: 'MEDIUM',
          hours_source: 'CROWD',
          inference_note: hoursUpdate.inference_note,
          last_hours_verified_at: new Date().toISOString(),
        })
        .eq('id', store_id);
    }
  }

  return NextResponse.json({
    success: true,
    message: '제보해주셔서 정말 감사해요. 덕분에 더 정확한 지도가 되어가고 있어요!',
  });
}
