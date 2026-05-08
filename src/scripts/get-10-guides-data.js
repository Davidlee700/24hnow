const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getStoresFor10Guides() {
  const guideConfigs = [
    { id: 'dy_cafe_hj', region: '덕양구', subRegion: '화정동', category: '카페' },
    { id: 'dy_cafe_hs', region: '덕양구', subRegion: '행신동', category: '카페' },
    { id: 'dy_carwash', region: '덕양구', category: '셀프세차장' },
    { id: 'dy_pc', region: '덕양구', category: 'PC방' },
    { id: 'dg_cafe', region: '일산동구', category: '카페' },
    { id: 'dg_carwash', region: '일산동구', category: '셀프세차장' },
    { id: 'dg_pc', region: '일산동구', category: 'PC방' },
    { id: 'sg_cafe', region: '일산서구', category: '카페' },
    { id: 'sg_carwash', region: '일산서구', category: '셀프세차장' },
    { id: 'sg_pc', region: '일산서구', category: 'PC방' }
  ];

  for (const config of guideConfigs) {
    let query = supabase
      .from('stores')
      .select('name, road_address, raw_hours, category, trust_score')
      .ilike('road_address', `%${config.region}%`)
      .eq('category', config.category);

    if (config.subRegion) {
      query = query.ilike('road_address', `%${config.subRegion}%`);
    }

    const { data, error } = await query
      .order('trust_score', { ascending: false })
      .limit(5);

    if (data) {
      console.log(`=== ${config.id} ===`);
      data.forEach((s, i) => {
        console.log(`${i+1}|${s.name}|${s.road_address}|${s.raw_hours || '24시간'}`);
      });
    }
  }
}

getStoresFor10Guides();
