import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Missing store_id' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('store_comments')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`comments:${getIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  const body = await req.json();
  const { store_id, user_id, author_name, content, selected_tags } = body;

  if (!store_id || !author_name?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (content && content.length > 500) {
    return NextResponse.json({ error: '댓글은 500자 이내로 작성해 주세요.' }, { status: 400 });
  }

  if (author_name.length > 50) {
    return NextResponse.json({ error: '이름은 50자 이내로 작성해 주세요.' }, { status: 400 });
  }

  const tags = Array.isArray(selected_tags) ? selected_tags.slice(0, 5) : [];

  const { data, error } = await supabase
    .from('store_comments')
    .insert({
      store_id,
      user_id,
      author_name: author_name.trim(),
      content: content.trim(),
      selected_tags: tags,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, comment: data });
}
