import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const BASE = 'https://composecoffee.com';
const DELAY = 300;
const SESSION_REFRESH_EVERY = 800; // 800개마다 세션 갱신 (24분 만료 대비)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function removeSido(addr: string): string {
  return addr
    .replace(/^[가-힣]{2,6}(?:특별시|광역시|특별자치시|특별자치도|도)\s+/, '')
    .replace(/^[가-힣]{2,3}\s+(?=[가-힣]+(구|시|군))/, '');
}

function normalizeAddr(raw: string): string {
  let a = raw.replace(/,\s*\([^)]*\)\s*$/, '').replace(/,.*$/, '');
  a = a.replace(/\(.*?\)/g, '');
  // 층수 제거: "3 1층", "17 B1층", "5 지하1층", "203 2층 우측" 등
  a = a.replace(/\s+(?:\d+|[a-zA-Z]?\d+)?(?:지하)?\d+층.*$/i, '');
  a = a.replace(/(\d+(?:-\d+)?) +[가-힣A-Z].+$/, '$1');
  a = a.replace(/\s+/g, ' ').trim();
  return removeSido(a);
}

function parseHM(hhmm: string): { hour: number; minute: number } | null {
  const m = hhmm.trim().match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return { hour: parseInt(m[1]), minute: parseInt(m[2]) };
}

function buildBusinessHours(weekday: string, saturday: string, sunday: string) {
  const wdO = parseHM(weekday.split('-')[0]);
  const wdC = parseHM(weekday.split('-')[1]);
  if (!wdO || !wdC) return null;

  const satO = parseHM((saturday || weekday).split('-')[0]);
  const satC = parseHM((saturday || weekday).split('-')[1]);
  const sunO = parseHM((sunday || weekday).split('-')[0]);
  const sunC = parseHM((sunday || weekday).split('-')[1]);

  const periods = [];
  for (let d = 0; d <= 4; d++) {
    periods.push({ open: { day: d, hour: wdO.hour, minute: wdO.minute }, close: { day: d, hour: wdC.hour, minute: wdC.minute } });
  }
  if (satO && satC) {
    periods.push({ open: { day: 5, hour: satO.hour, minute: satO.minute }, close: { day: 5, hour: satC.hour, minute: satC.minute } });
  }
  if (sunO && sunC) {
    periods.push({ open: { day: 6, hour: sunO.hour, minute: sunO.minute }, close: { day: 6, hour: sunC.hour, minute: sunC.minute } });
  }

  const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];
  const fmt = (h: string) => h.trim().replace(/^(\d):/, '0$1:');
  return {
    periods,
    weekdayDescriptions: days.map((d, i) => {
      if (i < 5) return `${d}: ${fmt(weekday)}`;
      if (i === 5) return `${d}: ${fmt(saturday || weekday)}`;
      return `${d}: ${fmt(sunday || weekday)}`;
    }),
  };
}

interface Session {
  cookie: string;
  csrf: string;
}

interface StoreSrl {
  store_srl: string;
  lat: number;
  lng: number;
}

async function fetchSession(): Promise<Session & { srls?: StoreSrl[] }> {
  const res = await fetch(`${BASE}/findstore`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36' },
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const phpsessid = setCookie.match(/PHPSESSID=([^;]+)/)?.[1] ?? '';
  const loginStatus = setCookie.match(/rx_login_status=([^;]+)/)?.[1] ?? 'none';
  const cookie = `rx_login_status=${loginStatus}; PHPSESSID=${phpsessid}`;

  const html = await res.text();
  const csrf = html.match(/csrf-token" content="([^"]+)"/)?.[1] ?? '';

  // Extract store_srls + coords from embedded JS
  const srls: StoreSrl[] = [];
  const latRe = /new naver\.maps\.LatLng\(([\d.]+),([\d.]+)\)/g;
  const srlRe = /pos\.store_srl = (\d+)/g;
  const coords: [number, number][] = [];
  const srlNums: string[] = [];
  let m;
  while ((m = latRe.exec(html)) !== null) coords.push([parseFloat(m[1]), parseFloat(m[2])]);
  while ((m = srlRe.exec(html)) !== null) srlNums.push(m[1]);
  for (let i = 0; i < Math.min(coords.length, srlNums.length); i++) {
    srls.push({ store_srl: srlNums[i], lat: coords[i][0], lng: coords[i][1] });
  }

  return { cookie, csrf, srls };
}

async function fetchOverlay(
  storeSrl: string,
  session: Session,
): Promise<{ address: string; weekday: string; saturday: string; sunday: string } | null> {
  const res = await fetch(`${BASE}/`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36',
      'Referer': `${BASE}/findstore`,
      'Cookie': session.cookie,
    },
    body: `module=storemap&act=procStoremapGetInfoOverlay&mid=findstore&store_srl=${storeSrl}&_rx_csrf_token=${session.csrf}`,
  });

  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;

  let data: { result: string; error: number; message: string };
  try {
    data = await res.json();
  } catch { return null; }
  if (data.message !== 'success') return null;

  const html = data.result;
  const addr = html.match(/id="place_item_info_address">([^<]+)</)?.[1]?.trim() ?? '';
  const weekday = html.match(/id="place_item_info_hour_weekday">([^<]+)</)?.[1]?.trim() ?? '';
  const saturday = html.match(/id="place_item_info_hour_saturday">([^<]+)</)?.[1]?.trim() ?? '';
  const sunday = html.match(/id="place_item_info_hour_weekend">([^<]+)</)?.[1]?.trim() ?? '';

  if (!addr) return null;
  return { address: addr, weekday, saturday, sunday };
}

function matchStore(norm: string, dbMap: Map<string, string>): string | undefined {
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
  return matchId;
}

async function main() {
  console.log('☕ 컴포즈커피 영업시간 스크래핑 (재실행 - 세션갱신 포함)\n');

  // DB 로드
  console.log('📋 DB 컴포즈커피 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, road_address')
      .ilike('name', '컴포즈커피%')
      .range(from, from + 999);
    if (error) { console.error('DB 오류:', error.message); break; }
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB 컴포즈커피: ${dbStores.length.toLocaleString()}개\n`);

  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  // 초기 세션 + store_srl 목록 취득
  console.log('🌐 세션 취득 + 매장 목록 로드 중...');
  let session = await fetchSession();
  const srls = (session as any).srls as StoreSrl[];
  console.log(`  → CSRF: ${session.csrf.slice(0, 8)}... | 매장 ${srls.length}개\n`);

  type UpdateRow = {
    id: string;
    weekday: string;
    saturday: string;
    sunday: string;
    businessHours: object | null;
  };
  const updates = new Map<string, UpdateRow>(); // id → row (dedup)
  let fetched = 0;
  let matched = 0;
  let sessionFails = 0;

  for (const s of srls) {
    fetched++;

    // 세션 갱신: SESSION_REFRESH_EVERY개마다 OR 연속 실패 5회
    if (fetched % SESSION_REFRESH_EVERY === 0 || sessionFails >= 5) {
      process.stdout.write(`\n  🔄 세션 갱신 중 (${fetched}번째)...`);
      try {
        const newSession = await fetchSession();
        session = { cookie: newSession.cookie, csrf: newSession.csrf };
        sessionFails = 0;
        process.stdout.write(' 완료\n');
      } catch {
        process.stdout.write(' 실패, 기존 세션 유지\n');
      }
      await sleep(500);
    }

    await sleep(DELAY);
    try {
      const info = await fetchOverlay(s.store_srl, session);
      if (!info) {
        sessionFails++;
        continue;
      }
      sessionFails = 0;

      if (!info.weekday) continue;

      const norm = normalizeAddr(info.address);
      const matchId = matchStore(norm, dbMap);
      if (!matchId) continue;

      matched++;
      updates.set(matchId, {
        id: matchId,
        weekday: info.weekday,
        saturday: info.saturday,
        sunday: info.sunday,
        businessHours: buildBusinessHours(info.weekday, info.saturday, info.sunday),
      });
      process.stdout.write(`\r  [${fetched}/${srls.length}] 매칭 ${matched}개...`);
    } catch {
      sessionFails++;
    }
  }

  console.log(`\n\n📊 결과: 매칭 ${matched}개 / DB ${dbStores.length}개\n`);

  if (updates.size === 0) { console.log('업데이트 없음'); return; }

  const now = new Date().toISOString();
  console.log('💾 DB 업데이트 중...');
  let done = 0;
  for (const u of updates.values()) {
    const sat = u.saturday || u.weekday;
    const sun = u.sunday || u.weekday;
    const sameAll = sat === u.weekday && sun === u.weekday;
    const rawHours = sameAll
      ? `매일: ${u.weekday}`
      : `평일: ${u.weekday} / 토: ${sat} / 일: ${sun}`;

    await supabase.from('stores').update({
      operation_type: 'REGULAR',
      raw_hours: rawHours,
      business_hours: u.businessHours,
      hours_source: 'CROWD',
      inference_note: '컴포즈커피 공식 웹사이트 영업시간',
      last_hours_verified_at: now,
    }).eq('id', u.id);

    done++;
    if (done % 50 === 0) process.stdout.write(`\r  ${done}/${updates.size}개`);
    await sleep(50);
  }

  console.log(`\n\n✨ 완료! ${updates.size}개 업데이트`);
}

main().catch(console.error);
