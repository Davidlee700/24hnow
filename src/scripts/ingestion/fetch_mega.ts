import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const MEGA_BASE = 'https://www.mega-mgccoffee.com/store/find';
const KAKAO_REST = 'https://dapi.kakao.com/v2/local/search/address.json';
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY!;
const DELAY = 350;
const PHPSESSID = 'o4122q9ce5a655scp2tro1d46u';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
  'Referer': `${MEGA_BASE}/`,
  'X-Requested-With': 'XMLHttpRequest',
  'Cookie': `PHPSESSID=${PHPSESSID}`,
};

const SIDOS = ['서울', '경기', '인천', '강원', '광주', '대전', '대구', '부산', '울산', '세종', '경남', '경북', '전남', '전북', '충남', '충북', '제주'];

interface MegaStore {
  idx: string;
  store_name2: string;
  store_address: string;
  store_lat: string;
  store_lng: string;
}

// 시도별 시군구 대표 주소 목록
async function getGugunAddresses(sido: string): Promise<string[]> {
  const res = await fetch(`${MEGA_BASE}/store_area_search.php?store_area_name=${encodeURIComponent(sido)}`, {
    headers: HEADERS,
  });
  const html = await res.text();
  const matches = [...html.matchAll(/panToSigungu\('([^']+)'\)/g)];
  return matches.map(m => m[1].trim());
}

// 주소 → 좌표 (Kakao REST Geocoding)
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${KAKAO_REST}?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  });
  const data = await res.json() as { documents: { y: string; x: string }[] };
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

// 좌표 주변 매장 로드
async function fetchNearby(lat: number, lng: number): Promise<MegaStore[]> {
  const res = await fetch(`${MEGA_BASE}/store.php?lat=${lat}&lng=${lng}`, {
    headers: HEADERS,
  });
  const data = await res.json() as { positions: MegaStore[] };
  return data.positions ?? [];
}

// 주소 정규화 (기존 방식과 동일)
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
  console.log('☕ 메가MGC커피 영업시간 스크래핑 시작\n');
  console.log('⚠️  메가커피는 영업시간 데이터가 없어 주소 매칭 후 REGULAR 처리만 수행\n');

  // DB 로드
  console.log('📋 DB 메가MGC커피 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, road_address')
      .eq('category', '카페')
      .ilike('name', '메가MGC커피%')
      .range(from, from + 999);
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB 메가MGC커피: ${dbStores.length.toLocaleString()}개\n`);

  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  // 전국 매장 수집 (idx 기준 dedup)
  const collected = new Map<string, MegaStore>();

  for (const sido of SIDOS) {
    process.stdout.write(`\n📍 ${sido} 처리 중...`);
    await sleep(DELAY);

    let addresses: string[];
    try {
      addresses = await getGugunAddresses(sido);
    } catch {
      process.stdout.write(` 시군구 로드 실패`);
      continue;
    }
    process.stdout.write(` ${addresses.length}개 시군구`);

    for (const addr of addresses) {
      await sleep(DELAY);
      const coords = await geocode(addr);
      if (!coords) continue;

      await sleep(DELAY);
      try {
        const stores = await fetchNearby(coords.lat, coords.lng);
        let newCount = 0;
        for (const s of stores) {
          if (!collected.has(s.idx)) { collected.set(s.idx, s); newCount++; }
        }
        if (newCount > 0) process.stdout.write(` +${newCount}`);
      } catch { /* 무시 */ }
    }
  }

  console.log(`\n\n📊 수집 결과: ${collected.size}개 매장\n`);

  // DB 매칭
  const matchedIds = new Set<string>();
  let matched = 0;

  for (const s of collected.values()) {
    if (!s.store_address) continue;
    const norm = normalizeAddr(s.store_address);
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
    matched++;
    matchedIds.add(matchId);
  }

  console.log(`매칭: ${matched}개 / DB ${dbStores.length}개\n`);

  if (matchedIds.size === 0) {
    console.log('업데이트 없음');
    return;
  }

  // DB 업데이트: 영업시간 데이터 없으므로 operation_type=REGULAR + hours_source=CROWD
  const BATCH = 500;
  const ids = [...matchedIds];
  const now = new Date().toISOString();
  console.log('💾 DB 업데이트 중...');

  for (let i = 0; i < ids.length; i += BATCH) {
    await supabase.from('stores').update({
      operation_type: 'REGULAR',
      hours_source: 'CROWD',
      inference_note: '메가MGC커피 공식 웹사이트 확인 (영업시간 미제공)',
      last_hours_verified_at: now,
    }).in('id', ids.slice(i, i + BATCH)).eq('operation_type', 'UNKNOWN');
    process.stdout.write(`\r  ${Math.min(i + BATCH, ids.length)}/${ids.length}개`);
  }

  console.log(`\n\n✨ 완료! ${matchedIds.size}개 REGULAR 업데이트`);
}

main().catch(console.error);
