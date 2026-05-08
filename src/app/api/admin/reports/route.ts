import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateToken } from '../auth/route';

export async function GET(req: NextRequest) {
  if (!validateToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch reports, join with stores to get store name.
  // We assume there's a foreign key relation. If not, this might fail, but let's try standard relation.
  const { data, error } = await supabase
    .from('user_reports')
    .select(`
      id,
      store_id,
      report_type,
      comment,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback if relation doesn't exist
    const fallback = await supabase
      .from('user_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
    return NextResponse.json({ reports: fallback.data });
  }

  return NextResponse.json({ reports: data });
}
