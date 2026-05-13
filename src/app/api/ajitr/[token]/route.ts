import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: folder, error } = await supabase
    .from('ajitr_folders')
    .select('id, name, emoji, is_public, user_id')
    .eq('share_token', token)
    .single();

  if (error || !folder || !folder.is_public) {
    return NextResponse.json({ error: 'not_found' }, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('store_id, name, category, road_address, latitude, longitude')
    .eq('folder_id', folder.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    folder: { id: folder.id, name: folder.name, emoji: folder.emoji },
    bookmarks: bookmarks ?? [],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
