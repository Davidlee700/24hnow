import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const BASE = 'https://mo.twosome.co.kr';
const DELAY = 400;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// 세션 쿠키 — 만료 시 재발급 필요
const SESSION_COOKIE = 'JSESSIONID=OPcPqxYv7mLEERsb86VxKGboPiRYVm1XeDjJxB96.mobile_1; SCOUTER=xf9kev302v4ug';

interface TwosomeStore {
  STORE_NM: string;
  STORE_ROADNM_BASIC_AD: string;
  STORE_ROADNM_DTL_AD: string;
  ORD_TIME: string;   // "07:30 ~ 21:30"
  TOTAL_COUNT: number;
  TPAGE_NUM: number;
  NEXT_PAGE: number;
}

async function fetchPage(pageNum: number): Promise<{ stores: TwosomeStore[]; totalPages: number }> {
  const res = await fetch(`${BASE}/ts/storeListAjax.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': SESSION_COOKIE,
      'Referer': `${BASE}/ts/tsSearchStoreList.do`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
    },
    body: new URLSearchParams({
      searchTxt: '',
      lat: '37.5665',
      longi: '126.9780',
      scope: 'all',
      pageNum: String(pageNum),
      optCds: '',
      menuCd: '',
      reqPath: '/ts/tsSearchStoreList.do',
      menuType: 'W',
      menuGubn: '',
    }).toString(),
  });
  const data = await res.json() as { queryCode: string; fetchResultListSet: TwosomeStore[] };
  if (String(data.queryCode) !== '1000') throw new Error(`queryCode: ${data.queryCode}`);
  const stores = data.fetchResultListSet ?? [];
  const totalPages = stores[0]?.TPAGE_NUM ?? 1;
  return { stores, totalPages };
}

// 시도명 제거
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

// "07:30 ~ 21:30" → business_hours JSONB
function parseOrdTime(ordTime: string): { periods: object[]; weekdayDescriptions: string[] } | null {
  if (!ordTime) return null;
  const m = ordTime.match(/(\d{2}):(\d{2})\s*~\s*(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, oh, om, ch, cm] = m.map(Number);
  const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  const period = {
    open: { day: 0, hour: oh, minute: om },
    close: { day: 0, hour: ch, minute: cm },
  };
  return {
    periods: Array.from({ length: 7 }, (_, i) => ({
      open: { day: i, hour: oh, minute: om },
      close: { day: i, hour: ch, minute: cm },
    })),
    weekdayDescriptions: days.map(d => `${d}: ${ordTime}`),
  };
}

async function main() {
  console.log('☕ 투썸플레이스 영업시간 스크래핑 시작\n');

  // DB: 투썸플레이스 매장
  console.log('📋 DB 투썸플레이스 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, road_address')
      .eq('category', '카페')
      .ilike('name', '투썸플레이스%')
      .range(from, from + 999);
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB 투썸플레이스: ${dbStores.length.toLocaleString()}개\n`);

  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  // 1페이지로 총 페이지 수 파악
  const first = await fetchPage(1);
  const totalPages = first.totalPages;
  console.log(`📄 총 ${first.stores[0]?.TOTAL_COUNT ?? '?'}개 매장, ${totalPages}페이지\n`);

  type UpdateRow = {
    id: string;
    ord_time: string;
    business_hours: object | null;
  };
  const updates: UpdateRow[] = [];
  let totalMatched = 0;

  const processStores = (stores: TwosomeStore[]) => {
    for (const s of stores) {
      // 주소 조합: BASIC + DTL (중복 없게)
      const basic = s.STORE_ROADNM_BASIC_AD?.trim() ?? '';
      const dtl = s.STORE_ROADNM_DTL_AD?.trim() ?? '';
      const fullAddr = dtl && !basic.includes(dtl.slice(0, 5))
        ? `${basic} ${dtl}`
        : basic;
      if (!fullAddr) continue;

      const norm = normalizeAddr(fullAddr);
      let matchId = dbMap.get(norm);

      if (!matchId) {
        for (const [dbAddr, id] of dbMap) {
          if (dbAddr.length > 10 && norm.startsWith(dbAddr)) { matchId = id; break; }
        }
      }
      if (!matchId) {
        for (const [dbAddr, id] of dbMap) {
          if (norm.length > 10 && dbAddr.startsWith(norm)) { matchId = id; break; }
        }
      }

      if (!matchId) continue;
      totalMatched++;
      updates.push({
        id: matchId,
        ord_time: s.ORD_TIME ?? '',
        business_hours: parseOrdTime(s.ORD_TIME),
      });
    }
  };

  processStores(first.stores);
  process.stdout.write(`\r  페이지 1/${totalPages} (매칭 ${totalMatched}개)`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY);
    const { stores } = await fetchPage(page);
    processStores(stores);
    process.stdout.write(`\r  페이지 ${page}/${totalPages} (매칭 ${totalMatched}개)`);
  }

  console.log(`\n\n📊 결과: 매칭 ${totalMatched}개 / DB ${dbStores.length}개\n`);

  if (updates.length === 0) {
    console.log('업데이트 없음');
    return;
  }

  const BATCH = 200;
  const now = new Date().toISOString();
  console.log('💾 DB 업데이트 중...');

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      await supabase.from('stores').update({
        operation_type: 'REGULAR',
        raw_hours: u.ord_time || null,
        business_hours: u.business_hours,
        hours_source: 'CROWD',
        inference_note: '투썸플레이스 공식 앱 API',
        last_hours_verified_at: now,
      }).eq('id', u.id);
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, updates.length)}/${updates.length}개 완료`);
    await sleep(100);
  }

  console.log(`\n\n✨ 완료! ${updates.length}개 업데이트`);
}

main().catch(console.error);
