import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

const TARGET_REGIONS = ['일산', '파주', '고양', '의정부', '양주'];
const TARGET_CATEGORIES = ['카페', '편의점', '셀프세차장'];

async function fetchKakaoPlaces(query: string) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `KakaoAK ${KAKAO_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Kakao API Error:`, errorText);
    return [];
  }

  const data = await response.json();
  return data.documents || [];
}

async function saveToSupabase(item: any, category: string) {
  const { place_name, road_address_name, x, y, id, category_group_name } = item;
  
  console.log(`Processing: ${place_name}...`);

  const { error } = await supabase
    .from('stores')
    .upsert({
      name: place_name,
      category: category,
      road_address: road_address_name || item.address_name,
      latitude: parseFloat(y),
      longitude: parseFloat(x),
      is_24h: true,
      metadata: {
        kakao_id: id,
        kakao_category: category_group_name,
        source: 'kakao_api'
      },
      last_verified_at: new Date().toISOString(),
      trust_score: 85 // Kakao data is generally reliable
    }, { onConflict: 'name, road_address' });

  if (error) console.error('Supabase Error:', error);
  else console.log(`✅ Saved: ${place_name}`);
}

async function run() {
  console.log('🚀 Starting Kakao Data Ingestion...');
  
  for (const region of TARGET_REGIONS) {
    for (const cat of TARGET_CATEGORIES) {
      const query = `${region} 24시 ${cat}`;
      console.log(`🔍 Searching: ${query}`);
      
      const items = await fetchKakaoPlaces(query);
      for (const item of items) {
        // Kakao search might return non-24h places if the query is just a keyword.
        // We trust the query "24시" for now but we can refine later.
        await saveToSupabase(item, cat);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  console.log('✨ Kakao Data Collection Finished!');
}

run();
