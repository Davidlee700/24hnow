import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ALL_REGIONS, SEOUL, GYEONGGI, INCHEON } from './regions';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const NAVER_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const NAVER_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;
const NCP_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NCP_SECRET = process.env.NAVER_CLIENT_SECRET;

const args = process.argv.slice(2);
const isRemainingOnly = args.includes('--remaining');
const startArg = args.find(a => a.startsWith('--start='));
const startRegion = startArg ? startArg.split('=')[1] : null;

let TARGET_REGIONS = ALL_REGIONS;

if (isRemainingOnly) {
  const excludeRegions = [...SEOUL, ...GYEONGGI, ...INCHEON];
  TARGET_REGIONS = ALL_REGIONS.filter(r => !excludeRegions.includes(r));
  console.log(`ℹ️ 수도권(서울/경기/인천)을 제외한 잔여 ${TARGET_REGIONS.length}개 지역 수집 진행`);
}

if (startRegion) {
  const startIndex = TARGET_REGIONS.indexOf(startRegion);
  if (startIndex !== -1) {
    TARGET_REGIONS = TARGET_REGIONS.slice(startIndex);
    console.log(`ℹ️ ${startRegion}부터 수집 시작 (${TARGET_REGIONS.length}개 지역 남음)`);
  } else {
    console.warn(`⚠️ 시작 지역 [${startRegion}]을 찾을 수 없습니다. 처음부터 진행합니다.`);
  }
}

const TARGET_CATEGORIES = ['카페', '편의점', '셀프세차장', 'PC방'];

/**
 * 🛠️ Heuristic Classification Engine
 * 신뢰도 기반 분류 체계 (Class A, B, C)
 */
function classifyStore(name: string, category: string, description: string = ''): { class_type: string, inference_note: string } {
  const text = (name + ' ' + description + ' ' + category).toLowerCase();
  
  // 1. Class A (확정적 패턴)
  const patternA = /(24시 영업|24시간 영업|연중무휴|365일|00:00~24:00|00:00~00:00)/;
  if (patternA.test(text)) {
    return { class_type: 'A', inference_note: '영업시간 데이터 명시됨 (Class A)' };
  }

  // 2. Class C (조건부 패턴)
  const patternC = /(주말만|금토|요일별|특정일)/;
  if (patternC.test(text)) {
    return { class_type: 'C', inference_note: '특정 요일/조건부 운영 (Class C)' };
  }

  // 3. Class B (추정 패턴)
  // - 상호명에 24 포함
  if (/(24시|24시간|24h)/.test(name)) {
    return { class_type: 'B', inference_note: '상호명에 24시 포함 (Class B)' };
  }
  
  // - 업종 특성 (편의점, PC방은 기본적으로 24시 추정)
  if (category.includes('편의점') || category.includes('PC방')) {
    return { class_type: 'B', inference_note: '업종 특성상 24시 추정 (Class B)' };
  }
  
  // - 세차장 (대부분 24시)
  if (category.includes('세차장') || /(워시|wash|개러지|garage)/.test(name.toLowerCase())) {
    return { class_type: 'B', inference_note: '세차장/워시 관련 업종 특성상 24시 추정 (Class B)' };
  }

  return { class_type: 'UNKNOWN', inference_note: '24시간 운영 여부 불분명' };
}

async function getLatLng(address: string) {
  if (!address) return null;
  const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, {
      headers: { 'x-ncp-apigw-api-key-id': NCP_ID!, 'x-ncp-apigw-api-key': NCP_SECRET! }
    });
    const data = await res.json();
    if (data.addresses?.length > 0) {
      return { lat: parseFloat(data.addresses[0].y), lng: parseFloat(data.addresses[0].x) };
    }
  } catch (e) { console.error('Geocoding fail:', address); }
  return null;
}

async function fetchKakao(region: string, category: string) {
  const query = `${region} ${category}`; // No "24h" in query
  const all: any[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
    const data = await res.json();
    const docs = data.documents || [];
    all.push(...docs);
    if (data.meta?.is_end || docs.length < 15) break;
    await new Promise(r => setTimeout(r, 100));
  }
  return all.map(d => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
    source: 'kakao',
    category,
    metadata: { kakao_id: d.id, phone: d.phone, place_url: d.place_url }
  }));
}

async function fetchNaver(region: string, category: string) {
  const query = `${region} ${category}`;
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=20`;
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': NAVER_ID!, 'X-Naver-Client-Secret': NAVER_SECRET! }
  });
  const data = await res.json();
  const items = data.items || [];
  return items.map((i: any) => ({
    name: i.title.replace(/<[^>]*>?/gm, ''),
    address: i.roadAddress || i.address,
    source: 'naver',
    category,
    metadata: { phone: i.telephone, naver_place_url: i.link, description: i.description }
  }));
}

async function run() {
  console.log('🚀 Data Ingestion v2 시작 (Category-First + Heuristic)');

  for (const region of TARGET_REGIONS) {
    for (const cat of TARGET_CATEGORIES) {
      console.log(`\n🔍 [${region}] ${cat} 수집 중...`);
      
      const [kakaoItems, naverItems] = await Promise.all([
        fetchKakao(region, cat),
        fetchNaver(region, cat)
      ]);

      const combined = [...kakaoItems, ...naverItems];
      console.log(`   → 총 ${combined.length}개 후보 발견 (중복 제거 전)`);

      for (const item of combined) {
        // 1. 분류 (Heuristic)
        const { class_type, inference_note } = classifyStore(item.name, item.category, item.metadata.description || '');
        
        // 24시간 관련 단서가 전혀 없는 경우 스킵 (효율성)
        if (class_type === 'UNKNOWN') continue;

        // 2. 중복 확인
        const { data: existing } = await supabase
          .from('stores')
          .select('id, metadata')
          .eq('name', item.name)
          .eq('road_address', item.address)
          .maybeSingle();

        if (existing) {
          // 데이터 보강 (Metadata Merge)
          const updatedMetadata = { ...existing.metadata, ...item.metadata };
          await supabase.from('stores').update({ 
            metadata: updatedMetadata, 
            class_type, 
            inference_note,
            is_24h: class_type === 'A' || class_type === 'B'
          }).eq('id', existing.id);
          continue;
        }

        // 3. 좌표 확보 (네이버 데이터의 경우 지오코딩 필요)
        let lat = item.lat;
        let lng = item.lng;
        if (!lat || !lng) {
          const coords = await getLatLng(item.address);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        }

        if (!lat || !lng) continue;

        // 4. 저장
        const { error } = await supabase.from('stores').insert({
          name: item.name,
          category: item.category,
          road_address: item.address,
          latitude: lat,
          longitude: lng,
          is_24h: class_type === 'A' || class_type === 'B',
          class_type,
          inference_note,
          metadata: { ...item.metadata, source_v2: item.source },
          last_verified_at: new Date().toISOString(),
          trust_score: class_type === 'A' ? 90 : 70
        });

        if (!error) console.log(`   ✅ [Class ${class_type}] ${item.name}`);
        await new Promise(r => setTimeout(r, 150));
      }
    }
  }

  console.log('\n✨ v2 수집 완료!');
}

run();
