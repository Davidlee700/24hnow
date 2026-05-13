import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const BASE = 'https://www.ediya.com/inc/ajax_adm_map.php';
const DELAY = 400;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const PHPSESSID = '2p6d38kdq5qc87mhcufq941fg6';
const HEADERS = {
  'Accept': '*/*',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Cookie': `PHPSESSID=${PHPSESSID}`,
  'Origin': 'https://www.ediya.com',
  'Referer': 'https://www.ediya.com/contents/find_store.html',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
};

interface EdiyaStore {
  name: string;
  address: string;
  weekdayHours: string;  // "08:00 ~ 22:00"
  weekendHours: string;  // "09:00 ~ 22:00"
  lat: number;
  lng: number;
}

// 응답 파싱: ///로 구분된 4섹션 (_&12345&_ 구분자)
function parseResponse(raw: string): EdiyaStore[] {
  const sections = raw.split('_&12345&_');
  if (sections.length < 4) return [];

  const addrs = sections[0].split('///').map(s => s.trim()).filter(Boolean);
  const hoursParts = sections[1].split('///').map(s => s.trim()).filter(Boolean);
  const names = sections[2].split('///').map(s => s.trim()).filter(Boolean);
  const coords = sections[3].split('///').map(s => s.trim()).filter(Boolean);

  const stores: EdiyaStore[] = [];
  const len = Math.min(addrs.length, names.length, hoursParts.length, coords.length);

  for (let i = 0; i < len; i++) {
    const raw_h = hoursParts[i] ?? '';
    // "평일 운영시간 : 08:00 ~ 22:00<br/>주말 및 공휴일 : 09:00 ~ 22:00&phone&010-1234&phone&1234"
    const hoursText = raw_h.split('&phone&')[0];
    const weekdayM = hoursText.match(/평일[^:]*:\s*(\d{2}:\d{2}\s*~\s*\d{2}:\d{2})/);
    const weekendM = hoursText.match(/(?:주말|토요일)[^:]*:\s*(\d{2}:\d{2}\s*~\s*\d{2}:\d{2})/);

    const coordStr = coords[i] ?? '';
    const coordM = coordStr.match(/([\d.]+)&Lat&([\d.]+)/);
    const lat = coordM ? parseFloat(coordM[1]) : 0;
    const lng = coordM ? parseFloat(coordM[2]) : 0;

    stores.push({
      name: names[i] ?? '',
      address: addrs[i] ?? '',
      weekdayHours: weekdayM ? weekdayM[1].trim() : '',
      weekendHours: weekendM ? weekendM[1].trim() : '',
      lat,
      lng,
    });
  }
  return stores;
}

function parseTime(hhmm: string): { hour: number; minute: number } | null {
  const m = hhmm.match(/(\d{2}):(\d{2})/);
  if (!m) return null;
  return { hour: parseInt(m[1]), minute: parseInt(m[2]) };
}

function buildBusinessHours(weekday: string, weekend: string) {
  const wdOpen = parseTime(weekday.split('~')[0]?.trim() ?? '');
  const wdClose = parseTime(weekday.split('~')[1]?.trim() ?? '');
  const weOpen = parseTime((weekend || weekday).split('~')[0]?.trim() ?? '');
  const weClose = parseTime((weekend || weekday).split('~')[1]?.trim() ?? '');

  if (!wdOpen || !wdClose) return null;

  const periods = [];
  // 월~금 (0~4)
  for (let d = 0; d <= 4; d++) {
    periods.push({
      open: { day: d, hour: wdOpen.hour, minute: wdOpen.minute },
      close: { day: d, hour: wdClose.hour, minute: wdClose.minute },
    });
  }
  // 토~일 (5~6)
  if (weOpen && weClose) {
    for (let d = 5; d <= 6; d++) {
      periods.push({
        open: { day: d, hour: weOpen.hour, minute: weOpen.minute },
        close: { day: d, hour: weClose.hour, minute: weClose.minute },
      });
    }
  }

  const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  const weekdayDesc = `평일: ${weekday}`;
  const weekendDesc = weekend ? `주말: ${weekend}` : weekdayDesc;

  return {
    periods,
    weekdayDescriptions: [
      ...Array(5).fill(weekdayDesc),
      weekendDesc,
      weekendDesc,
    ].map((desc, i) => `${days[i]}: ${i < 5 ? weekday : (weekend || weekday)}`),
  };
}

// 주소 정규화
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

async function fetchDistrict(district: string): Promise<EdiyaStore[]> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: HEADERS,
    body: `gubun=map&address=${encodeURIComponent(district)}`,
  });
  const text = await res.text();
  if (!text || text.startsWith('<')) return [];
  return parseResponse(text);
}

async function main() {
  console.log('☕ 이디야커피 영업시간 스크래핑 시작\n');

  // DB 로드
  console.log('📋 DB 이디야커피 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, road_address')
      .eq('category', '카페')
      .ilike('name', '이디야커피%')
      .range(from, from + 999);
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB 이디야커피: ${dbStores.length.toLocaleString()}개\n`);

  // DB 주소에서 구/시/군 추출 - 모든 주소 패턴 대응
  const districtSet = new Set<string>();
  for (const s of dbStores) {
    if (!s.road_address) continue;
    // 주소에서 X구/X시/X군 모두 추출 (여러 개 가능)
    const matches = s.road_address.matchAll(/([가-힣]+(?:구|시|군))/g);
    for (const m of matches) {
      const name = m[1];
      // 광역시/특별시/특별자치시 등 시도 단위 제외
      if (/(특별시|광역시|특별자치시|특별자치도)/.test(name)) continue;
      if (name.length <= 1) continue;
      districtSet.add(name);
    }
  }
  const districts = [...districtSet].sort();
  console.log(`📍 검색할 구/시/군: ${districts.length}개\n`);

  // DB 주소 맵
  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  // 수집
  const collected = new Map<string, EdiyaStore>(); // address → store (dedup)

  for (let i = 0; i < districts.length; i++) {
    const district = districts[i];
    process.stdout.write(`\r  [${i + 1}/${districts.length}] ${district.padEnd(8)} 수집 중...`);
    await sleep(DELAY);
    try {
      const stores = await fetchDistrict(district);
      for (const s of stores) {
        if (s.address && !collected.has(s.address)) {
          collected.set(s.address, s);
        }
      }
    } catch { /* 무시 */ }
  }

  console.log(`\n\n📊 수집: ${collected.size}개 매장\n`);

  // 매칭 + 업데이트 목록 작성
  type UpdateRow = {
    id: string;
    weekday: string;
    weekend: string;
    businessHours: object | null;
  };
  const updates: UpdateRow[] = [];

  for (const s of collected.values()) {
    const norm = normalizeAddr(s.address);
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

    const raw = `평일: ${s.weekdayHours}${s.weekendHours ? ` / 주말: ${s.weekendHours}` : ''}`;
    updates.push({
      id: matchId,
      weekday: s.weekdayHours,
      weekend: s.weekendHours,
      businessHours: buildBusinessHours(s.weekdayHours, s.weekendHours),
    });
  }

  console.log(`매칭: ${updates.length}개 / DB ${dbStores.length}개\n`);

  if (updates.length === 0) { console.log('업데이트 없음'); return; }

  // DB 업데이트
  const now = new Date().toISOString();
  console.log('💾 DB 업데이트 중...');
  let done = 0;
  for (const u of updates) {
    const raw = `평일: ${u.weekday}${u.weekend ? ` / 주말: ${u.weekend}` : ''}`;
    await supabase.from('stores').update({
      operation_type: 'REGULAR',
      raw_hours: raw,
      business_hours: u.businessHours,
      hours_source: 'CROWD',
      inference_note: '이디야커피 공식 웹사이트 영업시간',
      last_hours_verified_at: now,
    }).eq('id', u.id);
    done++;
    if (done % 50 === 0) process.stdout.write(`\r  ${done}/${updates.length}개`);
    await sleep(50);
  }

  console.log(`\n\n✨ 완료! ${updates.length}개 업데이트`);
}

main().catch(console.error);
