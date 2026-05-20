// EXTENDED(LOW) + UNKNOWN 매장 대상 영업시간 보강
// 1단계: 기존 metadata.description 재파싱 (API 0건)
// 2단계: description 없는 매장만 Naver API 재조회
// 사용법: npm run enrich:naver
//         npm run enrich:naver -- --api-only   (2단계만)
//         npm run enrich:naver -- --limit=500

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseKoreanHours } from '../../utils/parseKoreanHours';
import { crossVerifyHours } from '../../utils/hoursVerification';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const NAVER_ID = process.env.NAVER_SEARCH_CLIENT_ID!;
const NAVER_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET!;

const args = process.argv.slice(2);
const API_ONLY = args.includes('--api-only');
const limitArg = args.find(a => a.startsWith('--limit='));
const BATCH_LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 99999;

// 대상: EXTENDED(LOW confidence) + UNKNOWN
async function fetchTargetStores() {
  const stores: any[] = [];
  const PAGE = 1000;
  let from = 0;

  while (stores.length < BATCH_LIMIT) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, road_address, category, raw_hours, metadata')
      .or('operation_type.eq.UNKNOWN,and(operation_type.eq.EXTENDED,confidence_level.eq.LOW)')
      .order('last_hours_verified_at', { ascending: true, nullsFirst: true })
      .range(from, from + PAGE - 1);

    if (error || !data || data.length === 0) break;
    stores.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return stores.slice(0, BATCH_LIMIT);
}

async function fetchNaverDescription(name: string, address: string): Promise<string | null> {
  const query = `${name} ${address}`.trim();
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_ID,
        'X-Naver-Client-Secret': NAVER_SECRET,
      },
    });
    const data = await res.json();
    const items: any[] = data.items ?? [];

    const cleanName = name.replace(/\s/g, '').toLowerCase();
    const match = items.find(i => {
      const title = i.title.replace(/<[^>]*>/g, '').replace(/\s/g, '').toLowerCase();
      return title.includes(cleanName) || cleanName.includes(title);
    }) ?? items[0];

    return match?.description ?? null;
  } catch {
    return null;
  }
}

async function tryUpdateStore(store: any, description: string | null): Promise<boolean> {
  if (!description) return false;

  const raw_hours = parseKoreanHours(description);
  if (!raw_hours) return false;

  const verification = crossVerifyHours({
    kakaoHours: store.raw_hours ?? null,
    naverHours: raw_hours,
    category: store.category ?? '',
  });

  // UNKNOWN → 분류 가능한 경우만 업데이트
  // EXTENDED(LOW) → hours 확보 시 confidence 상향
  const newOperationType = verification.operation_type !== 'UNKNOWN'
    ? verification.operation_type
    : store.operation_type === 'EXTENDED' ? 'EXTENDED' : null;

  if (!newOperationType) return false;

  const { error } = await supabase
    .from('stores')
    .update({
      raw_hours: verification.canonical_hours ?? raw_hours,
      operation_type: newOperationType,
      hours_source: verification.hours_source ?? 'NAVER',
      confidence_level: verification.confidence_level ?? 'MEDIUM',
      last_hours_verified_at: new Date().toISOString(),
    })
    .eq('id', store.id);

  return !error;
}

async function run() {
  console.log('🔍 영업시간 보강 시작');
  console.log(`모드: ${API_ONLY ? 'API 재조회만' : '기존 description 재파싱 → API 재조회'}\n`);

  const stores = await fetchTargetStores();
  console.log(`대상: ${stores.length}개 (EXTENDED LOW + UNKNOWN)\n`);

  let phase1Updated = 0;
  let needsApi: any[] = [];

  // ── 1단계: 기존 metadata.description 재파싱 (API 0건) ──────────────
  if (!API_ONLY) {
    console.log('━━ 1단계: 기존 description 재파싱 ━━');
    for (const store of stores) {
      const desc = store.metadata?.description ?? null;
      if (!desc) { needsApi.push(store); continue; }

      const updated = await tryUpdateStore(store, desc);
      if (updated) {
        console.log(`✅ [재파싱] ${store.name}`);
        phase1Updated++;
      } else {
        needsApi.push(store);
      }
    }
    console.log(`\n1단계 완료: ${phase1Updated}개 업데이트, ${needsApi.length}개 API 필요\n`);
  } else {
    needsApi = stores;
  }

  // ── 2단계: Naver API 재조회 ────────────────────────────────────────
  if (needsApi.length === 0) {
    console.log('API 재조회 필요한 매장 없음. 완료!');
    return;
  }

  console.log(`━━ 2단계: Naver API 재조회 (${needsApi.length}건) ━━`);
  console.log(`※ 일일 한도: 25,000건 / 현재 대상: ${needsApi.length}건\n`);

  let phase2Updated = 0;
  let noHours = 0;
  let apiCalls = 0;

  for (const store of needsApi) {
    const description = await fetchNaverDescription(store.name, store.road_address ?? '');
    apiCalls++;
    await new Promise(r => setTimeout(r, 120));

    const updated = await tryUpdateStore(store, description);
    if (updated) {
      console.log(`✅ [API] ${store.name}`);
      phase2Updated++;
    } else {
      noHours++;
    }

    if (apiCalls % 100 === 0) {
      console.log(`  → ${apiCalls}건 처리 중... (업데이트: ${phase2Updated}, 미확인: ${noHours})`);
    }
  }

  console.log(`\n✨ 최종 완료`);
  console.log(`  1단계(재파싱): ${phase1Updated}개`);
  console.log(`  2단계(API):    ${phase2Updated}개`);
  console.log(`  영업시간 미확인: ${noHours}개`);
  console.log(`  Naver API 사용: ${apiCalls}건 / 25,000 한도`);
}

run();
