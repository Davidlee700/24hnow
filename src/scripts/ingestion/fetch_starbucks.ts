import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = 'https://www.starbucks.co.kr/store';
const COOKIE = process.env.STARBUCKS_COOKIE ?? '';

const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Referer': 'https://www.starbucks.co.kr/store/store_map.do?disp=locale',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Origin': 'https://www.starbucks.co.kr',
  ...(COOKIE ? { 'Cookie': COOKIE } : {}),
};

const DAY_ENG_TO_KO: Record<string, string> = {
  MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일',
};
const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function rndCod(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 12);
}

async function postDo(path: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, rndCod: rndCod() }).toString();
  try {
    const res = await fetch(`${BASE}/${path}`, { method: 'POST', headers: HEADERS, body });
    const text = await res.text();
    const jsonStart = text.indexOf('{');
    if (jsonStart === -1) return null;
    let depth = 0, jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
    }
    if (jsonEnd === -1) return null;
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

// getStore.do — 브라우저에서 실제로 사용하는 엔드포인트 (전체 파라미터 필요)
async function getStoreDo(path: string, params: Record<string, string>): Promise<any> {
  const rnd = rndCod();
  const body = new URLSearchParams({
    in_biz_cds: '0', in_scodes: '0',
    ins_lat: '37.5665', ins_lng: '126.9780',
    search_text: '', in_biz_cd: '',
    isError: 'true', searchType: 'C', set_date: '',
    all_store: '0',
    T03: '0', T01: '0', T27: '0', T12: '0', T09: '0', T30: '0', T05: '0',
    T22: '0', T21: '0', T36: '0', T43: '0', Z9999: '0', T64: '0',
    P02: '0', P10: '0', P50: '0', P20: '0', P60: '0', P30: '0',
    P70: '0', P40: '0', P80: '0', whcroad_yn: '0', P90: '0', P01: '0',
    new_bool: '0', in_distance: '0', iend: '1000',
    ...params,
  }).toString();
  try {
    const res = await fetch(`${BASE}/${path}?r=${rnd}`, { method: 'POST', headers: HEADERS, body });
    const text = await res.text();
    const jsonStart = text.indexOf('{');
    if (jsonStart === -1) return null;
    let depth = 0, jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { jsonEnd = i; break; } }
    }
    if (jsonEnd === -1) return null;
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch {
    return null;
  }
}

function buildRawHours(timeList: any[]): string {
  const byDay: Record<string, string> = {};
  for (const item of timeList) {
    const dayEng: string = item.store_time_week_str;
    const opentime: string = item.store_opentime;
    if (dayEng && opentime) byDay[dayEng] = opentime;
  }
  return DAY_ORDER
    .filter(d => byDay[d])
    .map(d => `${DAY_ENG_TO_KO[d]}: ${byDay[d]}`)
    .join(' ');
}

function getOperationType(timeList: any[]): 'REGULAR' | 'EXTENDED' | '24H' {
  const openTimes = timeList.map(t => t.store_opentime as string);
  if (openTimes.every(t => t === '0000-2400')) return '24H';
  const isLate = openTimes.some(t => {
    const close = t.split('-')[1];
    const closeH = parseInt(close.slice(0, 2));
    return closeH >= 24 || closeH <= 5;
  });
  return isLate ? 'EXTENDED' : 'REGULAR';
}

async function run() {
  if (!COOKIE) {
    console.error('❌ STARBUCKS_COOKIE 환경변수가 없습니다.');
    console.error('   .env.local에 브라우저 쿠키를 추가해주세요:');
    console.error('   STARBUCKS_COOKIE="_xm_webid_1_=...; JSESSIONID=...;"');
    process.exit(1);
  }

  console.log('☕ 스타벅스 공식 영업시간 수집 시작\n');

  // 1. 시도 목록 (sido_cd 포함)
  const sidoData = await postDo('getSidoList.do', {});
  const sidoList: Array<{ sido_cd: string; sido_nm: string }> =
    (sidoData?.list || []).filter((s: any) => s.sido_cd && s.sido_nm);
  console.log(`시도 ${sidoList.length}개 확인`);

  let updated = 0;
  let notInDb = 0;
  let noHours = 0;

  for (const sido of sidoList) {
    // 2. 구군 목록 (sido_cd 기반)
    const gugunData = await postDo('getGugunList.do', { sido_cd: sido.sido_cd });
    const gugunList: any[] = (gugunData?.list ?? []).filter((g: any) => g.gugun_cd && g.gugun_nm);
    if (!gugunList.length) {
      console.log(`  ⚠️  [${sido.sido_nm}] 구군 목록 없음`);
      await delay(300);
      continue;
    }
    console.log(`\n[${sido.sido_nm}] 구군 ${gugunList.length}개`);

    for (const gugun of gugunList) {
      // 3. 매장 목록 (getStore.do — 브라우저 실사용 엔드포인트)
      const storeData = await getStoreDo('getStore.do', {
        p_sido_cd: sido.sido_cd,
        p_gugun_cd: gugun.gugun_cd,
      });
      const stores: any[] = (storeData?.list ?? []).filter((s: any) => s.s_biz_code);
      if (!stores.length) { await delay(200); continue; }
      console.log(`  [${gugun.gugun_nm}] ${stores.length}개 점포`);

      for (const store of stores) {
        const bizCd: string = store.s_biz_code;
        const lat = parseFloat(store.lat);
        const lng = parseFloat(store.lot);
        if (!bizCd || isNaN(lat) || isNaN(lng)) continue;

        // 4. 영업시간 조회
        const timeData = await postDo('getStoreTime.do', { in_biz_cd: bizCd, in_store_type: 'C' });
        const timeList: any[] = timeData?.list ?? [];
        if (!timeList.length) { noHours++; await delay(150); continue; }

        const raw_hours = buildRawHours(timeList);
        const operation_type = getOperationType(timeList);

        // 5. DB 매칭 — 좌표 기반 (약 110m 반경) + 이름에 '스타벅스' 포함
        const { data: matches } = await supabase
          .from('stores')
          .select('id, name')
          .eq('category', '카페')
          .ilike('name', '%스타벅스%')
          .gte('latitude', lat - 0.001)
          .lte('latitude', lat + 0.001)
          .gte('longitude', lng - 0.001)
          .lte('longitude', lng + 0.001);

        if (!matches?.length) { notInDb++; await delay(150); continue; }

        for (const match of matches) {
          const { error } = await supabase.from('stores').update({
            raw_hours,
            operation_type,
            hours_source: 'starbucks_official',
            confidence_level: 'HIGH',
            trust_score: 90,
            last_hours_verified_at: new Date().toISOString(),
          }).eq('id', match.id);

          if (!error) {
            console.log(`    ✅ ${match.name} [${operation_type}] ${raw_hours}`);
            updated++;
          }
        }

        await delay(200);
      }

      await delay(200);
    }

    await delay(300);
  }

  console.log(`\n✨ 완료!`);
  console.log(`   업데이트: ${updated}개`);
  console.log(`   DB 미매칭 (미수집 매장): ${notInDb}개`);
  console.log(`   시간 정보 없음: ${noHours}개`);
}

run();
