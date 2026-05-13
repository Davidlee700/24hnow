import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const BASE = 'https://emart24.co.kr';
const DELAY = 300;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Emart24Store {
  TITLE: string;
  ADDRESS: string;
  SVR_24: number;
  CODE: string;
}

interface ApiResponse {
  error: number;
  count: number;
  data: Emart24Store[];
}

async function fetchPage(page: number): Promise<ApiResponse> {
  const res = await fetch(`${BASE}/api1/store?page=${page}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': `${BASE}/store`,
    },
  });
  return res.json() as Promise<ApiResponse>;
}

function removeSido(addr: string): string {
  return addr
    .replace(/^[가-힣]{2,6}(?:특별시|광역시|특별자치시|특별자치도|도)\s+/, '')
    .replace(/^[가-힣]{2,3}\s+(?=[가-힣]+(구|시|군))/, '');
}

function normalizeAddr(raw: string): string {
  let a = raw.replace(/,\s*\([^)]*\)\s*$/, '').replace(/,.*$/, '');
  a = a.replace(/\(.*?\)/g, '');
  a = a.replace(/(\d+(?:-\d+)?) +[가-힣A-Z].+$/, '$1');
  a = a.replace(/\s+/g, ' ').trim();
  return removeSido(a);
}

async function main() {
  console.log('🏪 이마트24 24시간 스크래핑 시작\n');

  // DB: 이마트24 편의점만
  console.log('📋 DB 이마트24 편의점 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, road_address')
      .eq('category', '편의점')
      .like('name', '이마트24%')
      .range(from, from + 999);
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB 이마트24: ${dbStores.length.toLocaleString()}개\n`);

  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  // 전체 페이지 수 확인
  const first = await fetchPage(1);
  const totalPages = Math.ceil(first.count / 40);
  console.log(`📄 총 ${first.count}개 매장, ${totalPages}페이지\n`);

  const updates24h = new Set<string>();
  const updatesRegular = new Set<string>();
  let totalMatched = 0;

  const processStore = (store: Emart24Store) => {
    if (!store.ADDRESS) return;
    const norm = normalizeAddr(store.ADDRESS);

    let matchId = dbMap.get(norm);

    if (!matchId) {
      for (const [dbAddr, id] of dbMap) {
        if (dbAddr.length > 10 && norm.startsWith(dbAddr)) {
          matchId = id; break;
        }
      }
    }

    if (!matchId) {
      for (const [dbAddr, id] of dbMap) {
        if (norm.length > 10 && dbAddr.startsWith(norm)) {
          matchId = id; break;
        }
      }
    }

    if (!matchId) return;
    totalMatched++;
    if (store.SVR_24 === 1) updates24h.add(matchId);
    else updatesRegular.add(matchId);
  };

  // 첫 페이지 처리
  first.data.forEach(processStore);
  process.stdout.write(`\r  페이지 1/${totalPages} 처리 중...`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY);
    const res = await fetchPage(page);
    res.data.forEach(processStore);
    process.stdout.write(`\r  페이지 ${page}/${totalPages} 처리 중... (매칭 ${totalMatched}개)`);
  }

  console.log(`\n\n📊 결과:`);
  console.log(`  24H: ${updates24h.size}개`);
  console.log(`  REGULAR: ${updatesRegular.size}개`);
  console.log(`  총 매칭: ${totalMatched}개 / DB ${dbStores.length}개\n`);

  const BATCH = 500;

  if (updates24h.size > 0) {
    console.log('💾 24H 업데이트...');
    const ids = [...updates24h];
    for (let i = 0; i < ids.length; i += BATCH) {
      await supabase.from('stores').update({
        operation_type: '24H',
        hours_source: 'CROWD',
        inference_note: '이마트24 공식 웹사이트 24시간 확인',
        last_hours_verified_at: new Date().toISOString(),
      }).in('id', ids.slice(i, i + BATCH));
    }
    console.log(`  → ${updates24h.size}개`);
  }

  if (updatesRegular.size > 0) {
    const unknownOnly = [...updatesRegular].filter(id => !updates24h.has(id));
    console.log('💾 REGULAR 업데이트 (UNKNOWN→REGULAR만)...');
    for (let i = 0; i < unknownOnly.length; i += BATCH) {
      await supabase.from('stores').update({
        operation_type: 'REGULAR',
        hours_source: 'CROWD',
        inference_note: '이마트24 공식 웹사이트 — 24시간 아님',
        last_hours_verified_at: new Date().toISOString(),
      }).in('id', unknownOnly.slice(i, i + BATCH)).eq('operation_type', 'UNKNOWN');
    }
    console.log(`  → ${unknownOnly.length}개`);
  }

  console.log('\n✨ 완료!');
}

main().catch(console.error);
