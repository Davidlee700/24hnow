import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateToken } from '../auth/route';

export async function GET(req: NextRequest) {
  if (!validateToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch stores, ordering by recently added/updated if possible.
  // We'll select essential fields for the dashboard.
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, road_address, category, business_hours, trust_score, created_at')
    .order('trust_score', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores: data });
}
