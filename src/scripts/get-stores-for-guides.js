const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getStoresForGuides() {
  const regions = ['덕양구', '일산동구', '일산서구'];
  const categories = ['카페', '셀프세차장', 'PC방'];

  for (const region of regions) {
    for (const category of categories) {
      const { data, error } = await supabase
        .from('stores')
        .select('name, road_address, raw_hours, category, trust_score')
        .ilike('road_address', `%${region}%`)
        .eq('category', category)
        .order('trust_score', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        console.log(`--- ${region} | ${category} ---`);
        data.forEach((s, i) => {
          console.log(`${i+1}. ${s.name} | ${s.road_address} | ${s.raw_hours}`);
        });
      }
    }
  }
}

getStoresForGuides();
