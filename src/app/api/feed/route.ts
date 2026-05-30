import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  try {
    // Fetch latest 20 comments with associated store details (name, category)
    // Assuming Supabase has a foreign key relationship set up between store_comments(store_id) and stores(id).
    const { data, error } = await supabase
      .from('store_comments')
      .select(`
        id,
        content,
        author_name,
        created_at,
        selected_tags,
        store_id,
        stores (
          name,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process the data to make it easier for the frontend to consume
    const formattedFeed = data.map((item: any) => ({
      id: item.id,
      content: item.content,
      author_name: item.author_name,
      created_at: item.created_at,
      selected_tags: item.selected_tags,
      store_id: item.store_id,
      store_name: item.stores?.name || '알 수 없는 매장',
      store_category: item.stores?.category || '기타'
    }));

    return NextResponse.json({ success: true, feed: formattedFeed });
  } catch (error: any) {
    console.error('Error fetching global feed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
