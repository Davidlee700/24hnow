import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;

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

// Kakao keyword search: max 45 results per query (3 pages × 15)
async function fetchKakaoPlaces(query: string): Promise<any[]> {
  const all: any[] = [];

  for (let page = 1; page <= 3; page++) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });

    if (!res.ok) {
      console.error(`Kakao API Error (page ${page}):`, await res.text());
      break;
    }

    const data = await res.json();
    const docs: any[] = data.documents || [];
    all.push(...docs);

    // Stop if last page
    if (data.meta?.is_end || docs.length < 15) break;

    await delay(150);
  }

  return all;
}

async function saveToSupabase(item: any, category: string) {
  const { place_name, road_address_name, x, y, id, category_group_name, category_name, phone, place_url } = item;

  // Skip if this Kakao place ID already exists
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('metadata->>kakao_id', id)
    .maybeSingle();

  if (existing) {
    console.log(`⏭️  Already exists: ${place_name}`);
    return;
  }

  const { error } = await supabase
    .from('stores')
    .upsert({
      name: place_name,
      category,
      road_address: road_address_name || item.address_name,
      latitude: parseFloat(y),
      longitude: parseFloat(x),
      is_24h: true,
      metadata: {
        kakao_id: id,
        kakao_category: category_group_name,
        kakao_category_full: category_name || null,
        phone: phone || null,
        place_url: place_url || null,
        source: 'kakao_api',
      },
      last_verified_at: new Date().toISOString(),
      trust_score: 85,
    }, { onConflict: 'name, road_address' });

  if (error) console.error('Supabase Error:', error.message);
  else console.log(`✅ Saved: ${place_name}`);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const total = TARGET_REGIONS.length * TARGET_CATEGORIES.length;
  let count = 0;

  console.log(`🚀 Kakao 데이터 수집 시작 — ${TARGET_REGIONS.length}개 지역 × ${TARGET_CATEGORIES.length}개 카테고리 = ${total}개 쿼리`);

  for (const region of TARGET_REGIONS) {
    for (const cat of TARGET_CATEGORIES) {
      count++;
      const query = `${region} 24시 ${cat}`;
      console.log(`\n[${count}/${total}] 🔍 ${query}`);

      const items = await fetchKakaoPlaces(query);
      console.log(`   → ${items.length}건 수신`);

      for (const item of items) {
        await saveToSupabase(item, cat);
        await delay(100);
      }
    }
  }

  console.log('\n✨ Kakao 수집 완료!');
}

run();
