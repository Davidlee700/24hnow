import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ALL_REGIONS_DONG, SEOUL_DONG, GYEONGGI_DONG, INCHEON_DONG } from './regions_dong';
import { crossVerifyHours } from '../../utils/hoursVerification';
import { parseKoreanHours } from '../../utils/parseKoreanHours';

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
const categoryArg = args.find(a => a.startsWith('--category='));
const onlyCategory = categoryArg ? categoryArg.split('=')[1] : null;

let TARGET_REGIONS = ALL_REGIONS_DONG;

if (isRemainingOnly) {
  const excludeRegions = new Set([...SEOUL_DONG, ...GYEONGGI_DONG, ...INCHEON_DONG]);
  TARGET_REGIONS = ALL_REGIONS_DONG.filter(r => !excludeRegions.has(r));
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

const ALL_CATEGORIES = ['카페', '편의점', '셀프세차장', 'PC방', '코인노래방', '셀프빨래방', '약국', '찜질방'];
const TARGET_CATEGORIES = onlyCategory
  ? ALL_CATEGORIES.filter(c => c === onlyCategory)
  : ALL_CATEGORIES;

if (onlyCategory) {
  if (TARGET_CATEGORIES.length === 0) {
    console.error(`❌ 알 수 없는 카테고리: ${onlyCategory}`);
    process.exit(1);
  }
  console.log(`ℹ️ 카테고리 필터: ${onlyCategory} 만 수집`);
}

// 카테고리별 심야 추가 쿼리 — 24시간은 아니지만 늦게까지 영업하는 업종 발굴
const LATE_NIGHT_EXTRA_QUERIES: Record<string, string[]> = {
  '카페':       ['심야카페', '새벽카페', '심야영업 카페', '늦게까지 카페'],
  '편의점':     [],
  '셀프세차장': [],
  'PC방':       ['심야PC방', '심야 PC방'],
  '코인노래방': ['심야 노래방', '24시 노래방', '새벽 노래방'],
  '셀프빨래방': ['24시 빨래방', '코인빨래방', '24시간 빨래방'],
  '약국':       [],   // 약국은 공공데이터(fetch_pharmacy.ts)가 주 소스
  '찜질방':     ['24시 찜질방', '24시간 찜질방', '24시 사우나', '24시간 사우나'],
};


/**
 * 🛠️ Heuristic Classification Engine
 * 신뢰도 기반 분류 체계 — is_24h/EXTENDED/REGULAR/UNKNOWN
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
  if (/(24시|24시간|24h)/.test(name)) {
    return { class_type: 'B', inference_note: '상호명에 24시 포함 (Class B)' };
  }

  if (category.includes('편의점') || category.includes('PC방')) {
    return { class_type: 'B', inference_note: '업종 특성상 24시 추정 (Class B)' };
  }

  if (category.includes('세차장') || /(워시|wash|개러지|garage)/.test(name.toLowerCase())) {
    return { class_type: 'B', inference_note: '세차장/워시 관련 업종 특성상 24시 추정 (Class B)' };
  }

  // 노래방: 새벽까지 영업이 업종 기본값 → EXTENDED 기본 분류, Google enrich로 추후 보정
  if (category.includes('노래방')) {
    return { class_type: 'C_EXTENDED', inference_note: '노래방 업종 — 심야 영업 기본값 EXTENDED, 시간 미확인' };
  }

  // 셀프빨래방: 24시간 무인 운영 많음
  if (category.includes('빨래방') || name.includes('셀프빨래') || name.includes('코인빨래')) {
    return { class_type: 'B', inference_note: '무인 셀프빨래방 업종 특성상 24시 추정 (Class B)' };
  }

  // 찜질방/사우나: 이름에 "24시" 명시 시 Class B, 그 외엔 EXTENDED 기본값으로 지도 노출 후 제보 수렴
  if (category.includes('찜질방') || name.includes('찜질방') || name.includes('사우나')) {
    if (/(24시|24시간|24h)/.test(text)) {
      return { class_type: 'B', inference_note: '찜질방/사우나 상호명에 24시 명시 (Class B)' };
    }
    return { class_type: 'C_EXTENDED', inference_note: '찜질방 업종 — 영업시간 미확인, 제보 환영 (EXTENDED 기본값)' };
  }

  // 약국: 기본 수집 대상 (심야약국은 Class C)
  if (category.includes('약국')) {
    if (/(24시|심야|야간|응급)/.test(text)) {
      return { class_type: 'A', inference_note: '심야/야간 약국 명시 (Class A)' };
    }
    return { class_type: 'UNKNOWN', inference_note: '일반 약국 — 24시간 여부 불분명' };
  }

  // 4. 심야 키워드 → UNKNOWN이 아닌 수집 대상으로 명시
  if (/(심야|새벽영업|늦게까지|자정|새벽까지)/.test(text)) {
    return { class_type: 'C', inference_note: '심야 키워드 감지, 영업시간 확인 필요 (Class C)' };
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

async function fetchKakaoByQuery(query: string, category: string) {
  const all: any[] = [];
  for (let page = 1; page <= 3; page++) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15&page=${page}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
      const data = await res.json();
      const docs = data.documents || [];
      all.push(...docs);
      if (data.meta?.is_end || docs.length < 15) break;
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`카카오 API 오류 (${query}):`, e);
      break;
    }
  }
  return all.map(d => ({
    name: d.place_name,
    address: d.road_address_name || d.address_name,
    lat: parseFloat(d.y),
    lng: parseFloat(d.x),
    source: 'kakao',
    category,
    raw_hours: null as string | null,
    metadata: { kakao_id: d.id, phone: d.phone, place_url: d.place_url }
  }));
}

async function fetchKakao(region: string, category: string) {
  const baseQuery = `${region} ${category}`;
  const extraQueries = LATE_NIGHT_EXTRA_QUERIES[category] ?? [];

  const results = await fetchKakaoByQuery(baseQuery, category);

  // 심야 키워드 추가 쿼리 (지역 prefix 포함)
  for (const extra of extraQueries) {
    const extraResult = await fetchKakaoByQuery(`${region} ${extra}`, category);
    results.push(...extraResult);
    await new Promise(r => setTimeout(r, 150));
  }

  return results;
}

async function fetchNaverByQuery(query: string, category: string) {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=20`;
  try {
    const res = await fetch(url, {
      headers: { 'X-Naver-Client-Id': NAVER_ID!, 'X-Naver-Client-Secret': NAVER_SECRET! }
    });
    const data = await res.json();
    const items = data.items || [];
    return items.map((i: any) => {
      const description = i.description ?? '';
      const raw_hours = parseKoreanHours(description);
      return {
        name: i.title.replace(/<[^>]*>?/gm, ''),
        address: i.roadAddress || i.address,
        source: 'naver',
        category,
        raw_hours,
        metadata: { phone: i.telephone, naver_place_url: i.link, description }
      };
    });
  } catch (e) {
    console.error(`네이버 API 오류 (${query}):`, e);
    return [];
  }
}

async function fetchNaver(region: string, category: string) {
  // 네이버는 기본 쿼리만 — API 한도 절약, 카카오에서 심야 추가 쿼리 담당
  return fetchNaverByQuery(`${region} ${category}`, category);
}

async function run() {
  console.log('🚀 Data Ingestion v2 시작 (Category-First + Hours-Aware)');

  for (const region of TARGET_REGIONS) {
    for (const cat of TARGET_CATEGORIES) {
      console.log(`\n🔍 [${region}] ${cat} 수집 중...`);

      const [kakaoItems, naverItems] = await Promise.all([
        fetchKakao(region, cat),
        fetchNaver(region, cat)
      ]);

      // 카카오+네이버 결과를 이름 기준으로 매칭해 단일 항목으로 병합
      const kakaoMap = new Map<string, typeof kakaoItems[0]>();
      for (const k of kakaoItems) kakaoMap.set(k.name + '|' + (k.address ?? ''), k);

      const naverMap = new Map<string, typeof naverItems[0]>();
      for (const n of naverItems) naverMap.set(n.name + '|' + (n.address ?? ''), n);

      // 카카오 우선, 네이버로 보강
      const mergedItems: Array<{
        name: string; address: string; lat?: number; lng?: number;
        category: string; kakaoHours: string | null; naverHours: string | null;
        metadata: Record<string, any>;
      }> = [];

      for (const [key, kItem] of kakaoMap) {
        const nItem = naverMap.get(key);
        mergedItems.push({
          name: kItem.name,
          address: kItem.address,
          lat: kItem.lat,
          lng: kItem.lng,
          category: cat,
          kakaoHours: kItem.raw_hours,
          naverHours: nItem?.raw_hours ?? null,
          metadata: {
            ...kItem.metadata,
            ...(nItem ? { phone: nItem.metadata.phone || kItem.metadata.phone, naver_place_url: nItem.metadata.naver_place_url, description: nItem.metadata.description } : {}),
            source_v2: 'kakao+naver',
          },
        });
        naverMap.delete(key);
      }
      // 카카오에 없는 네이버 전용 항목
      for (const [, nItem] of naverMap) {
        mergedItems.push({
          name: nItem.name,
          address: nItem.address,
          category: cat,
          kakaoHours: null,
          naverHours: nItem.raw_hours,
          metadata: { ...nItem.metadata, source_v2: 'naver' },
        });
      }

      console.log(`   → 병합 후 ${mergedItems.length}개 후보`);

      for (const item of mergedItems) {
        const { class_type, inference_note } = classifyStore(item.name, item.category, item.metadata.description || '');

        // 교차 검증으로 operation_type 결정
        const verification = crossVerifyHours({
          kakaoHours: item.kakaoHours,
          naverHours: item.naverHours,
          category: item.category,
        });

        // 이름·주소 없는 완전 노이즈만 스킵 (REGULAR/UNKNOWN도 저장 → enrich 대상)
        if (!item.name || !item.address) continue;

        const operation_type =
          class_type === 'A' || class_type === 'B' ? '24H' :
          class_type === 'C_EXTENDED' ? 'EXTENDED' :
          verification.operation_type;

        const is_24h = operation_type === '24H';
        const trust_score = class_type === 'A' ? 90 : is_24h ? 70 : operation_type === 'UNKNOWN' ? 30 : 55;

        // 중복 확인
        const { data: existing } = await supabase
          .from('stores')
          .select('id, metadata, operation_type, hours_source')
          .eq('name', item.name)
          .eq('road_address', item.address)
          .maybeSingle();

        if (existing) {
          const updatedMetadata = { ...existing.metadata, ...item.metadata };
          const shouldUpgradeHours = !existing.hours_source && verification.hours_source;
          await supabase.from('stores').update({
            metadata: updatedMetadata,
            class_type,
            inference_note: verification.inference_note ?? inference_note,
            is_24h,
            operation_type: shouldUpgradeHours ? operation_type : (existing.operation_type ?? operation_type),
            ...(shouldUpgradeHours ? {
              raw_hours: verification.canonical_hours,
              hours_source: verification.hours_source,
              confidence_level: verification.confidence_level,
              last_hours_verified_at: new Date().toISOString(),
            } : {}),
          }).eq('id', existing.id);
          continue;
        }

        // 좌표 확보
        let lat = item.lat;
        let lng = item.lng;
        if (!lat || !lng) {
          const coords = await getLatLng(item.address);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        }
        if (!lat || !lng) continue;

        const { error } = await supabase.from('stores').insert({
          name: item.name,
          category: item.category,
          road_address: item.address,
          latitude: lat,
          longitude: lng,
          is_24h,
          operation_type,
          class_type,
          inference_note: verification.inference_note ?? inference_note,
          raw_hours: verification.canonical_hours,
          hours_source: verification.hours_source,
          confidence_level: verification.confidence_level,
          metadata: item.metadata,
          last_verified_at: new Date().toISOString(),
          last_hours_verified_at: verification.hours_source ? new Date().toISOString() : null,
          trust_score,
        });

        if (!error) console.log(`   ✅ [${operation_type}/${class_type}] ${item.name}`);
        await new Promise(r => setTimeout(r, 150));
      }
    }
  }

  console.log('\n✨ v2 수집 완료!');
}

run();
