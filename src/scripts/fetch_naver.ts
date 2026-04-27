import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Naver Open API (Search)
const SEARCH_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const SEARCH_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

// Naver Cloud (Geocoding)
const NCP_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NCP_SECRET = process.env.NAVER_CLIENT_SECRET;

const TARGET_REGIONS = ['일산', '파주', '고양', '의정부', '양주'];
const TARGET_CATEGORIES = ['카페', '편의점', '셀프세차장'];

async function getLatLng(address: string) {
  // Try using the exact domain from the official guide's curl example
  const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
  
  const response = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': NCP_ID!,
      'x-ncp-apigw-api-key': NCP_SECRET!,
      'Accept': 'application/json'
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Geocoding Error (${response.status}):`, errorBody);
    return null;
  }
  const data = await response.json();
  if (data.addresses && data.addresses.length > 0) {
    return {
      lat: parseFloat(data.addresses[0].y),
      lng: parseFloat(data.addresses[0].x),
    };
  }
  return null;
}

async function fetchNaverPlaces(query: string) {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`;
  
  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': SEARCH_ID!,
      'X-Naver-Client-Secret': SEARCH_SECRET!,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Search Error:`, errorText);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

async function saveToSupabase(item: any, category: string) {
  const { title, roadAddress } = item;
  const cleanName = title.replace(/<[^>]*>?/gm, '');

  console.log(`Processing: ${cleanName}...`);
  
  // Get precise Lat/Lng via NCP Geocoding
  const coords = await getLatLng(roadAddress);
  
  if (!coords) {
    console.warn(`Could not find coordinates for: ${roadAddress}`);
    return;
  }

  const { error } = await supabase
    .from('stores')
    .upsert({
      name: cleanName,
      category: category,
      road_address: roadAddress,
      latitude: coords.lat,
      longitude: coords.lng,
      is_24h: true,
      metadata: {
        naver_raw: item,
        parking: roadAddress.includes('주차') || true, // Placeholder logic
      },
      last_verified_at: new Date().toISOString(),
      trust_score: 80 
    }, { onConflict: 'name, road_address' });

  if (error) console.error('Supabase Error:', error);
  else console.log(`✅ Saved: ${cleanName}`);
}

async function run() {
  console.log('🚀 Starting Data Ingestion...');
  
  for (const region of TARGET_REGIONS) {
    for (const cat of TARGET_CATEGORIES) {
      const query = `${region} 24시 ${cat}`;
      console.log(`🔍 Searching: ${query}`);
      
      const items = await fetchNaverPlaces(query);
      for (const item of items) {
        await saveToSupabase(item, cat);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
  
  console.log('✨ All Done!');
}

run();
