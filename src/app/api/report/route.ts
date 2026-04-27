import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { store_id, report_type, comment } = await req.json();

  if (!store_id || !report_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase
    .from('store_reports')
    .insert({
      store_id,
      report_type,
      comment: comment?.slice(0, 20) // Ensure 20 chars limit
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '제보해주셔서 정말 감사해요. 덕분에 더 정확한 지도가 되어가고 있어요!'
  });
}
