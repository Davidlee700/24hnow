import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '../auth/route';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!validateToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from('page_content')
    .select('*')
    .order('slug');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data });
}

export async function PATCH(req: NextRequest) {
  if (!validateToken(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug, title, subtitle, body_json } = await req.json();
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from('page_content')
    .upsert({ slug, title, subtitle, body_json, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
