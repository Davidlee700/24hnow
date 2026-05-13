import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const BASE = 'https://cu.bgfretail.com';
const DELAY = 350;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function acquireSession(): Promise<string> {
  const res = await fetch(`${BASE}/store/list.do?category=store`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    redirect: 'follow',
  });
  const m = (res.headers.get('set-cookie') ?? '').match(/JSESSIONID=([^;]+)/);
  if (!m) throw new Error('JSESSIONID 취득 실패');
  return m[1];
}

async function getGugunList(sess: string, sido: string): Promise<string[]> {
  const res = await fetch(`${BASE}/store/GugunList.do`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': `JSESSIONID=${sess}`,
    },
    body: new URLSearchParams({ sido }).toString(),
  });
  const text = new TextDecoder('euc-kr').decode(Buffer.from(await res.arrayBuffer()));
  try {
    return (JSON.parse(text) as { GugunList: { CODE_NAME: string }[] }).GugunList.map(g => g.CODE_NAME);
  } catch { return []; }
}

interface CuStore { name: string; address: string; is24h: boolean }

function parseStores(html: string): CuStore[] {
  const stores: CuStore[] = [];
  const re = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const row = m[1];
    const nm = row.match(/class="name">(.*?)<\/span>/);
    if (!nm) continue;
    const addr = row.match(/searchLatLng\('([^']+)'/);
    stores.push({
      name: nm[1].trim(),
      address: addr ? addr[1].trim() : '',
      is24h: /sevice01 on/.test(row),
    });
  }
  return stores;
}

async function fetchGugun(sess: string, sido: string, gugun: string): Promise<CuStore[]> {
  const all: CuStore[] = [];
  let page = 1;
  while (true) {
    const body = new URLSearchParams({
      pageIndex: String(page),
      listType: '', jumpoCode: '', jumpoLotto: '', jumpoToto: '',
      jumpoCash: '', jumpoHour: '', jumpoCafe: '', jumpoDelivery: '',
      jumpoBakery: '', jumpoFry: '', jumpoMultiDevice: '', jumpoPosCash: '',
      jumpoBattery: '', jumpoAdderss: '',
      jumpoSido: sido, sido, Gugun: '', jumpoGugun: gugun,
      jumpodong: '', searchWord: '', user_id: '', jumpoName: '',
    });
    const res = await fetch(`${BASE}/store/list_Ajax.do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE}/store/list.do?category=store`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Cookie': `JSESSIONID=${sess}`,
      },
      body: body.toString(),
    });
    const html = Buffer.from(await res.arrayBuffer()).toString('utf-8');
    if (html.includes('등록된 게시물이 없습니다')) break;
    const stores = parseStores(html);
    if (stores.length === 0) break;
    all.push(...stores);
    if (!html.includes(`newsPage('${page + 1}')`)) break;
    page++;
    await sleep(DELAY);
  }
  return all;
}

// 시도명 제거: "서울특별시", "서울", "경기도", "경기" 등 → 구/시/군 부터 시작
function removeSido(addr: string): string {
  return addr
    .replace(/^[가-힣]{2,6}(?:특별시|광역시|특별자치시|특별자치도|도)\s+/, '')  // 서울특별시, 경기도 등
    .replace(/^[가-힣]{2,3}\s+(?=[가-힣]+(구|시|군))/, '');                     // 서울, 경기, 인천 등 축약형
}

// 번지 뒤 건물명 제거, 괄호 제거, 시도명 제거
function normalizeAddr(raw: string): string {
  // 쉼표 이전 (괄호 밖 쉼표만: "강서로 498, (가양동)" → "강서로 498")
  let a = raw.replace(/,\s*\([^)]*\)\s*$/, '').replace(/,.*$/, '');
  a = a.replace(/\(.*?\)/g, '');           // 괄호 제거
  a = a.replace(/(\d+(?:-\d+)?) +[가-힣A-Z].+$/, '$1');  // 번지 뒤 건물명 제거
  a = a.replace(/\s+/g, ' ').trim();
  return removeSido(a);                    // 시도명 제거 → 구/시부터 비교
}

async function main() {
  console.log('🏪 CU 편의점 24시간 스크래핑 시작\n');

  const sess = await acquireSession();
  console.log('✅ 세션 취득 완료\n');

  // DB: CU 편의점만 (카카오·네이버 수집 데이터 이름 형태 = "CU강남점" 등)
  console.log('📋 DB CU 편의점 로드 중...');
  const dbStores: { id: string; road_address: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('id, road_address')
      .eq('category', '편의점')
      .like('name', 'CU%')
      .range(from, from + 999);
    if (!data?.length) break;
    dbStores.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`  → DB CU 편의점: ${dbStores.length.toLocaleString()}개\n`);

  // 정규화 주소 → id 맵
  const dbMap = new Map<string, string>();
  for (const s of dbStores) {
    if (s.road_address) dbMap.set(normalizeAddr(s.road_address), s.id);
  }

  const updates24h = new Set<string>();
  const updatesRegular = new Set<string>();

  for (const sido of [
    '서울특별시', '경기도', '인천광역시',
    '부산광역시', '대구광역시', '광주광역시', '대전광역시', '울산광역시',
    '세종특별자치시', '강원특별자치도', '충청북도', '충청남도',
    '전라남도', '전북특별자치도', '경상북도', '경상남도', '제주특별자치도',
  ]) {
    console.log(`\n📍 ${sido}`);
    const guguns = await getGugunList(sess, sido);
    console.log(`  구군 ${guguns.length}개`);

    for (const gugun of guguns) {
      process.stdout.write(`  [${gugun}] ...`);
      await sleep(DELAY);

      try {
        const cuStores = await fetchGugun(sess, sido, gugun);
        let matched = 0;

        for (const cs of cuStores) {
          if (!cs.address) continue;
          const cuNorm = normalizeAddr(cs.address);

          // 1) 완전 일치
          let matchId = dbMap.get(cuNorm);

          // 2) DB주소가 CU주소의 시작 (DB: "서초대로 398", CU: "서초대로 398 서초타워 2층")
          if (!matchId) {
            for (const [dbAddr, id] of dbMap) {
              if (dbAddr.length > 10 && cuNorm.startsWith(dbAddr)) {
                matchId = id; break;
              }
            }
          }

          // 3) CU주소가 DB주소의 시작 (주소 일부만 있는 경우)
          if (!matchId) {
            for (const [dbAddr, id] of dbMap) {
              if (cuNorm.length > 10 && dbAddr.startsWith(cuNorm)) {
                matchId = id; break;
              }
            }
          }

          if (!matchId) continue;
          matched++;
          if (cs.is24h) updates24h.add(matchId);
          else updatesRegular.add(matchId);
        }

        process.stdout.write(` ${cuStores.length}개 (매칭 ${matched}개)\n`);
      } catch (e) {
        process.stdout.write(` 오류: ${e}\n`);
      }

      await sleep(DELAY);
    }
  }

  console.log(`\n📊 결과:`);
  console.log(`  24H: ${updates24h.size}개`);
  console.log(`  REGULAR: ${updatesRegular.size}개\n`);

  const BATCH = 500;

  if (updates24h.size > 0) {
    console.log('💾 24H 업데이트...');
    const ids = [...updates24h];
    for (let i = 0; i < ids.length; i += BATCH) {
      await supabase.from('stores').update({
        operation_type: '24H',
        hours_source: 'CROWD',
        inference_note: 'CU 공식 웹사이트 24시간 확인',
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
        inference_note: 'CU 공식 웹사이트 — 24시간 아님',
        last_hours_verified_at: new Date().toISOString(),
      }).in('id', unknownOnly.slice(i, i + BATCH)).eq('operation_type', 'UNKNOWN');
    }
    console.log(`  → ${unknownOnly.length}개`);
  }

  console.log('\n✨ 완료!');
}

main().catch(console.error);
