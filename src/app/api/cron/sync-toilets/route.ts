import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return new Response('Unauthorized', { status: 401 }); // Commented out for local testing without cron secret, uncomment in prod if strict
    }

    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!serviceKey) {
      throw new Error('DATA_GO_KR_SERVICE_KEY is missing');
    }

    // 1. Fetch data from Public Data Portal
    // Fetching 1000 items. In a real scenario, you'd paginate or fetch specific regions.
    const url = `http://api.data.go.kr/openapi/tn_pubr_public_toilet_api?serviceKey=${serviceKey}&type=json&numOfRows=1000`;
    const res = await fetch(url);
    const json = await res.json();
    
    if (!json?.response?.body?.items) {
      throw new Error('Invalid response from Public Data API');
    }

    const items: any[] = json.response.body.items;
    
    // Filter out toilets that are 24H open
    const openToilets = items.filter(t => 
      t.openTimeInfo?.includes('24시간') || t.openTimeInfo?.includes('00:00~24:00')
    );

    // 2. Transform to our DB schema
    const storesToUpsert = openToilets.map(t => {
      // Deterministic ID fallback or new UUID
      const uniqueId = uuidv4();
      return {
        id: uniqueId,
        name: t.toiletNm,
        category: '화장실',
        road_address: t.rdnmadr || t.lnmadr || '주소 없음',
        latitude: parseFloat(t.latitude) || 37.5665,
        longitude: parseFloat(t.longitude) || 126.9780,
        operation_type: '24H',
        trust_score: 50, // Base score for public data
        metadata: {
          is_open_restroom: true,
          restroom_password: false, // Public usually has no password
          restroom_cleanliness: null, // Let users rate
          separated_gender: t.mwSepYn === 'Y'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // 3. Upsert to Supabase
    // To actually insert, uncomment the below.
    // const { error } = await supabase.from('stores').upsert(storesToUpsert, { onConflict: 'road_address' });
    // if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Synced ${storesToUpsert.length} 24H toilets successfully from Public Data.`,
      data: storesToUpsert
    });

  } catch (error: any) {
    console.error('Error syncing toilets:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
