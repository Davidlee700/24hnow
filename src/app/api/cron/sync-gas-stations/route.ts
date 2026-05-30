import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'edge';

// NOTE: This is a skeleton for the Opinet and EV API sync.
// Replace process.env.OPINET_API_KEY with actual keys.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 1. Fetch data from Opinet (Gas stations)
    // const opinetUrl = \`http://www.opinet.co.kr/api/detailById.do?out=json&code=\${process.env.OPINET_API_KEY}&id=...\`;
    
    // For demonstration, mock the payload of 24H filtered stations
    const mockGasStations = [
      {
        os_nm: "SK엔크린 관악주유소",
        new_adr: "서울특별시 관악구 남부순환로 1714",
        gis_x_coor: "126.936081",
        gis_y_coor: "37.483109",
        lpg_yn: "N",
        maint_yn: "Y",
        car_wash_yn: "Y",
        cvs_yn: "Y"
      },
      {
        os_nm: "GS칼텍스 서초주유소",
        new_adr: "서울특별시 서초구 서초대로 320",
        gis_x_coor: "127.014389",
        gis_y_coor: "37.493921",
        lpg_yn: "Y",
        maint_yn: "N",
        car_wash_yn: "Y",
        cvs_yn: "N"
      }
    ];

    // 2. Transform to our DB schema
    const storesToUpsert = mockGasStations.map(s => ({
      id: uuidv4(),
      name: s.os_nm,
      category: '주유/충전',
      road_address: s.new_adr,
      latitude: parseFloat(s.gis_y_coor),
      longitude: parseFloat(s.gis_x_coor),
      operation_type: '24H',
      trust_score: 80, // High trust for Opinet
      metadata: {
        has_car_wash: s.car_wash_yn === 'Y',
        has_convenience_store: s.cvs_yn === 'Y',
        has_ev_charging: null, // Will be updated by EV API
        is_lpg: s.lpg_yn === 'Y'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // 3. Upsert to Supabase
    // const { error } = await supabase.from('stores').upsert(storesToUpsert, { onConflict: 'road_address' });
    // if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Synced ${storesToUpsert.length} gas stations successfully.`,
      data: storesToUpsert
    });

  } catch (error: any) {
    console.error('Error syncing gas stations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
