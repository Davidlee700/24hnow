import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY!;
const BASE_URL = 'https://apis.data.go.kr/1741000/over_the_counter_medicine_stores/info';
const PAGE_SIZE = 100;

// 주소 정규화 — 콤마 이후 제거, 괄호 제거, 공백 정리
function normalizeAddr(addr: string): string {
  return addr
    .split(',')[0]
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAllMedicineStores(): Promise<{ name: string; addr: string }[]> {
  const stores: { name: string; addr: string }[] = [];

  // 총 개수 먼저 확인
  const firstRes = await fetch(`${BASE_URL}?serviceKey=${SERVICE_KEY}&pageNo=1&numOfRows=1&type=json`);
  const firstData = await firstRes.json();
  const total: number = firstData.response.body.totalCount;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  console.log(`📦 API 전체 업소 수: ${total.toLocaleString()}개 (${totalPages}페이지)`);

  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(`${BASE_URL}?serviceKey=${SERVICE_KEY}&pageNo=${page}&numOfRows=${PAGE_SIZE}&type=json`);
    const data = await res.json();
    const items = data.response.body.items?.item ?? [];

    for (const item of items) {
      // 영업 중인 업소만 (폐업 제외)
      if (item.SALS_STTS_CD !== '01') continue;
      if (!item.ROAD_NM_ADDR) continue;
      stores.push({
        name: item.BPLC_NM ?? '',
        addr: normalizeAddr(item.ROAD_NM_ADDR),
      });
    }

    if (page % 10 === 0 || page === totalPages) {
      process.stdout.write(`\r  → ${page}/${totalPages} 페이지 로딩 중... (${stores.length.toLocaleString()}개 영업중)`);
    }
  }
  console.log('\n');
  return stores;
}

async function main() {
  console.log('🔍 안전상비의약품 판매업소 매칭 시작\n');

  // 1. API에서 전국 판매업소 로딩
  const medicineStores = await fetchAllMedicineStores();

  // 주소 기준 Set 생성 (빠른 조회용)
  const medicineAddrSet = new Set(medicineStores.map(s => s.addr));
  console.log(`✅ 영업중 판매업소: ${medicineAddrSet.size.toLocaleString()}개 로딩 완료\n`);

  // 2. 우리 DB 편의점 전체 조회 (페이지네이션)
  console.log('📋 DB 편의점 조회 중...');
  const convStores: { id: string; name: string; road_address: string }[] = [];
  let from = 0;
  const CHUNK = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, road_address')
      .eq('category', '편의점')
      .range(from, from + CHUNK - 1);
    if (error) { console.error('DB 조회 실패:', error); return; }
    if (!data || data.length === 0) break;
    convStores.push(...data);
    if (data.length < CHUNK) break;
    from += CHUNK;
  }
  console.log(`  → 편의점 ${convStores.length.toLocaleString()}개 조회됨\n`);

  // 3. 주소 매칭
  const matchedIds: string[] = [];

  for (const store of convStores) {
    if (!store.road_address) continue;
    const normalizedDbAddr = normalizeAddr(store.road_address);

    // 완전 일치
    if (medicineAddrSet.has(normalizedDbAddr)) {
      matchedIds.push(store.id);
      continue;
    }

    // 부분 일치 — API 주소가 DB 주소를 포함하거나 그 반대
    const partialMatch = medicineStores.some(m =>
      m.addr.startsWith(normalizedDbAddr) || normalizedDbAddr.startsWith(m.addr)
    );
    if (partialMatch) matchedIds.push(store.id);
  }

  console.log(`🎯 매칭된 편의점: ${matchedIds.length.toLocaleString()}개 / ${convStores.length.toLocaleString()}개\n`);

  if (matchedIds.length === 0) {
    console.log('매칭 결과 없음. 종료.');
    return;
  }

  // 4. 배치 업데이트 (500개씩)
  console.log('💾 has_medicine = true 업데이트 중...');
  const BATCH = 500;
  let updated = 0;

  for (let i = 0; i < matchedIds.length; i += BATCH) {
    const batch = matchedIds.slice(i, i + BATCH);
    const { error: updateError } = await supabase
      .from('stores')
      .update({ has_medicine: true })
      .in('id', batch);

    if (updateError) {
      console.error(`배치 ${i / BATCH + 1} 업데이트 실패:`, updateError);
    } else {
      updated += batch.length;
      process.stdout.write(`\r  → ${updated.toLocaleString()}개 업데이트 완료`);
    }
  }

  console.log(`\n\n✨ 완료! has_medicine = true: ${updated.toLocaleString()}개`);
}

main().catch(console.error);
