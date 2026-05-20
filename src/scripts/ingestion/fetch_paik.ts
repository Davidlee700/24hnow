import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const API = 'https://theborndb.theborn.co.kr/wp-json/api';
const DELAY = 300;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface PaikStore {
  store_ID: number;
  store_name: string;
  store_brand: string;
  store_address: string;
  store_hours: string;
  store_closed: string;
}

interface ApiResponse {
  max_count: number;
  results: PaikStore[];
}

// Korean day name → index (Mon=0 … Sun=6)
const DAY_IDX: Record<string, number> = {
  월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6,
  월요일: 0, 화요일: 1, 수요일: 2, 목요일: 3, 금요일: 4, 토요일: 5, 일요일: 6,
};

function parseHM(s: string): { hour: number; minute: number } | null {
  const m = s.trim().match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { hour: parseInt(m[1]), minute: parseInt(m[2]) };
}

function parseRange(s: string): [{ hour: number; minute: number } | null, { hour: number; minute: number } | null] {
  const m = s.match(/(\d{1,2}:\d{2})\s*[~\-]\s*(\d{1,2}:\d{2})/);
  if (!m) return [null, null];
  return [parseHM(m[1]), parseHM(m[2])];
}

// "월-토요일" or "금-토" → day indices array
function parseDayRange(prefix: string): number[] {
  const rangeMatch = prefix.match(/([가-힣]+?)[-~]([가-힣]+)/);
  if (rangeMatch) {
    const from = DAY_IDX[rangeMatch[1]] ?? DAY_IDX[rangeMatch[1].replace(/요일/, '')] ?? -1;
    const to = DAY_IDX[rangeMatch[2]] ?? DAY_IDX[rangeMatch[2].replace(/요일/, '')] ?? -1;
    if (from === -1 || to === -1) return [];
    // Handle wrap-around (e.g., 일-목: 6,0,1,2,3)
    const days: number[] = [];
    let d = from;
    while (true) {
      days.push(d);
      if (d === to) break;
      d = (d + 1) % 7;
      if (days.length > 7) break;
    }
    return days;
  }
  // Single day or keyword
  if (prefix.includes('평일') || prefix.includes('월-금')) return [0, 1, 2, 3, 4];
  if (prefix.includes('주말')) return [5, 6];
  const single = DAY_IDX[prefix.trim()] ?? DAY_IDX[prefix.trim().replace(/요일/, '')];
  if (single !== undefined) return [single];
  return [];
}

function buildBusinessHours(raw: string): { periods: object[]; weekdayDescriptions: string[] } | null {
  const cleaned = raw.replace(/\(.*?\)/g, '').trim();
  const segments = cleaned.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);

  const dayNames = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  const periods: { open: object; close: object }[] = [];
  const descByDay: string[] = Array(7).fill('');

  if (segments.length === 1) {
    // e.g. "08:00 ~ 22:00"
    const [open, close] = parseRange(segments[0]);
    if (!open || !close) return null;
    for (let d = 0; d < 7; d++) {
      periods.push({ open: { day: d, ...open }, close: { day: d, ...close } });
      descByDay[d] = `${dayNames[d]}: ${segments[0].trim()}`;
    }
    return { periods, weekdayDescriptions: descByDay };
  }

  // Multiple segments
  for (const seg of segments) {
    // Try to find prefix (day indicator) before the time range
    const timeMatch = seg.match(/(\d{1,2}:\d{2}\s*[~\-]\s*\d{1,2}:\d{2})/);
    if (!timeMatch) continue;
    const [open, close] = parseRange(timeMatch[1]);
    if (!open || !close) continue;

    const prefix = seg.slice(0, seg.indexOf(timeMatch[1])).trim();
    const days = prefix ? parseDayRange(prefix) : [0, 1, 2, 3, 4, 5, 6];

    for (const d of days) {
      periods.push({ open: { day: d, ...open }, close: { day: d, ...close } });
      descByDay[d] = `${dayNames[d]}: ${timeMatch[1].trim()}`;
    }
  }

  if (periods.length === 0) return null;

  // Fill any missing days (shouldn't happen but safety net)
  for (let d = 0; d < 7; d++) {
    if (!descByDay[d]) descByDay[d] = `${dayNames[d]}: 정보없음`;
  }

  return { periods, weekdayDescriptions: descByDay };
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

async function fetchPage(paged: number): Promise<ApiResponse> {
  const res = await fetch(
    `${API}/get_store/?state=9&category=275&depth1=0&depth2=0&paged=${paged}&search_string=`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } },
  );
  return res.json() as Promise<ApiResponse>;
}

async function main() {
  console.log('☕ 빽다방 영업시간 스크래핑 시작\n');

  // DB 로드
  console.log('📋 DB 빽다방 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, road_address')
      .ilike('name', '빽다방%')
      .range(from, from + 999);
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB 빽다방: ${dbStores.length.toLocaleString()}개\n`);

  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  // 전체 페이지 파악
  const first = await fetchPage(1);
  const totalPages = Math.ceil(first.max_count / 10);
  console.log(`📄 총 ${first.max_count}개 매장, ${totalPages}페이지\n`);

  type UpdateRow = {
    id: string;
    rawHours: string;
    businessHours: object | null;
  };
  const updates: UpdateRow[] = [];
  let totalMatched = 0;

  const processPage = (stores: PaikStore[]) => {
    for (const s of stores) {
      if (!s.store_address) continue;
      const norm = normalizeAddr(s.store_address);
      let matchId = dbMap.get(norm);

      if (!matchId) {
        for (const [dbAddr, id] of dbMap) {
          if (dbAddr.length >= 6 && norm.startsWith(dbAddr)) { matchId = id; break; }
        }
      }
      if (!matchId) {
        for (const [dbAddr, id] of dbMap) {
          if (norm.length >= 6 && dbAddr.startsWith(norm)) { matchId = id; break; }
        }
      }
      if (!matchId) continue;

      totalMatched++;
      updates.push({
        id: matchId,
        rawHours: s.store_hours?.replace(/<br\s*\/?>/gi, ' / ').replace(/\(.*?\)/g, '').trim() ?? '',
        businessHours: s.store_hours ? buildBusinessHours(s.store_hours) : null,
      });
    }
  };

  processPage(first.results);
  process.stdout.write(`\r  페이지 1/${totalPages} (매칭 ${totalMatched}개)`);

  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY);
    const { results } = await fetchPage(page);
    processPage(results);
    process.stdout.write(`\r  페이지 ${page}/${totalPages} (매칭 ${totalMatched}개)`);
  }

  console.log(`\n\n📊 결과: 매칭 ${totalMatched}개 / DB ${dbStores.length}개\n`);

  if (updates.length === 0) { console.log('업데이트 없음'); return; }

  const BATCH = 200;
  const now = new Date().toISOString();
  console.log('💾 DB 업데이트 중...');

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      await supabase.from('stores').update({
        operation_type: 'REGULAR',
        raw_hours: u.rawHours || null,
        business_hours: u.businessHours,
        hours_source: 'CROWD',
        inference_note: '빽다방 공식 웹사이트 영업시간',
        last_hours_verified_at: now,
      }).eq('id', u.id);
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, updates.length)}/${updates.length}개 완료`);
    await sleep(100);
  }

  console.log(`\n\n✨ 완료! ${updates.length}개 업데이트`);
}

main().catch(console.error);
