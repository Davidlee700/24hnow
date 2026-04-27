import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SEARCH_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const SEARCH_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;
const NCP_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NCP_SECRET = process.env.NAVER_CLIENT_SECRET;

// 서울(25구) + 경기(31시/군) + 인천(10구/군) = 66개 지역
const TARGET_REGIONS = [
  // 서울 25구
  '서울 강남구', '서울 강북구', '서울 강동구', '서울 강서구', '서울 관악구',
  '서울 광진구', '서울 구로구', '서울 금천구', '서울 노원구', '서울 도봉구',
  '서울 동대문구', '서울 동작구', '서울 마포구', '서울 서대문구', '서울 서초구',
  '서울 성동구', '서울 성북구', '서울 송파구', '서울 양천구', '서울 영등포구',
  '서울 용산구', '서울 은평구', '서울 종로구', '서울 중구', '서울 중랑구',
  // 경기 31시/군
  '수원', '성남', '고양', '부천', '용인', '안산', '안양', '남양주', '화성', '평택',
  '의정부', '시흥', '파주', '광명', '김포', '광주', '군포', '하남', '오산', '이천',
  '양주', '구리', '안성', '포천', '의왕', '여주', '동두천', '과천', '가평', '양평', '연천',
  // 인천 10구/군
  '인천 중구', '인천 동구', '인천 미추홀구', '인천 연수구', '인천 남동구',
  '인천 부평구', '인천 계양구', '인천 서구', '인천 강화군', '인천 옹진군',
];

const TARGET_CATEGORIES = ['카페', '편의점', '셀프세차장'];

async function getLatLng(address: string) {
  const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': NCP_ID!,
      'x-ncp-apigw-api-key': NCP_SECRET!,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    console.error(`Geocoding Error (${res.status}):`, await res.text());
    return null;
  }

  const data = await res.json();
  if (data.addresses?.length > 0) {
    return { lat: parseFloat(data.addresses[0].y), lng: parseFloat(data.addresses[0].x) };
  }
  return null;
}

// Naver local search: display 5 per page, paginate until all results fetched
async function fetchNaverPlaces(query: string): Promise<any[]> {
  const all: any[] = [];
  let start = 1;

  while (true) {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&start=${start}`;
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': SEARCH_ID!,
        'X-Naver-Client-Secret': SEARCH_SECRET!,
      },
    });

    if (!res.ok) {
      console.error(`Search Error (start=${start}):`, await res.text());
      break;
    }

    const data = await res.json();
    const items: any[] = data.items || [];
    all.push(...items);

    // Stop when this page returned fewer results than requested (last page)
    // or when we've collected everything reported by `total`
    if (items.length < 5 || all.length >= data.total) break;

    start += 5;
    await delay(200);
  }

  return all;
}

async function saveToSupabase(item: any, category: string) {
  const { title, roadAddress, telephone, link } = item;
  const cleanName = title.replace(/<[^>]*>?/gm, '');

  // Skip if already stored (avoid unnecessary geocoding API calls)
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('name', cleanName)
    .eq('road_address', roadAddress)
    .maybeSingle();

  if (existing) {
    console.log(`⏭️  Already exists: ${cleanName}`);
    return;
  }

  const coords = await getLatLng(roadAddress);
  if (!coords) {
    console.warn(`좌표 없음: ${roadAddress}`);
    return;
  }

  const { error } = await supabase
    .from('stores')
    .upsert({
      name: cleanName,
      category,
      road_address: roadAddress,
      latitude: coords.lat,
      longitude: coords.lng,
      is_24h: true,
      metadata: {
        phone: telephone || null,
        naver_place_url: link || null,
        source: 'naver_api',
      },
      last_verified_at: new Date().toISOString(),
      trust_score: 80,
    }, { onConflict: 'name, road_address' });

  if (error) console.error('Supabase Error:', error.message);
  else console.log(`✅ Saved: ${cleanName}`);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const total = TARGET_REGIONS.length * TARGET_CATEGORIES.length;
  let count = 0;

  console.log(`🚀 Naver 데이터 수집 시작 — ${TARGET_REGIONS.length}개 지역 × ${TARGET_CATEGORIES.length}개 카테고리 = ${total}개 쿼리`);

  for (const region of TARGET_REGIONS) {
    for (const cat of TARGET_CATEGORIES) {
      count++;
      const query = `${region} 24시 ${cat}`;
      console.log(`\n[${count}/${total}] 🔍 ${query}`);

      const items = await fetchNaverPlaces(query);
      console.log(`   → ${items.length}건 수신`);

      for (const item of items) {
        await saveToSupabase(item, cat);
        await delay(200);
      }
    }
  }

  console.log('\n✨ Naver 수집 완료!');
}

run();
