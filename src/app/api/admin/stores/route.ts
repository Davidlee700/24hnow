import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { validateToken } from '../auth/route';

export async function GET(req: NextRequest) {
  if (!validateToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit      = 50;
  const search     = searchParams.get('search') ?? '';
  const category   = searchParams.get('category') ?? '';
  const opType     = searchParams.get('operation_type') ?? '';
  const from       = (page - 1) * limit;

  let query = supabase
    .from('stores')
    .select(
      'id, name, road_address, category, operation_type, confidence_level, hours_source, raw_hours, trust_score, last_hours_verified_at, last_verified_at, google_place_id, inference_note, class_type',
      { count: 'exact' }
    );

  if (search)   query = query.ilike('name', `%${search}%`);
  if (category) query = query.eq('category', category);
  if (opType)   query = query.eq('operation_type', opType);

  query = query.order('last_verified_at', { ascending: false }).range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ stores: data, total: count, page, limit });
}
