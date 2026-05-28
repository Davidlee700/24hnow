/**
 * 복권판매점 수집 스크립트
 *
 * 소스: 기획예산처_온라인복권 판매점 주소 (api.odcloud.kr/api/I5086355/v1)
 * 총 약 8,800건 → Kakao 지오코딩으로 주소→좌표 변환 후 Supabase 저장
 *
 * 실행: npx tsx src/scripts/ingestion/fetch_lottery.ts
 * 옵션:
 *   --dry-run   DB 저장 없이 첫 10건만 출력
 *   --page=N    N 페이지부터 재개 (오류 재시작용)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ODCLOUD_KEY = process.env.DATA_GO_KR_SERVICE_KEY!;
const KAKAO_KEY   = process.env.KAKAO_REST_API_KEY!;

const ODCLOUD_BASE = 'https://api.odcloud.kr/api/15086355/v1/uddi:ef7ca84b-c2bc-404a-9743-85752073b61b';
const PER_PAGE = 1000;
const GEOCODE_DELAY_MS = 120;   // Kakao 지오코딩 속도 제한 방지
const BATCH_UPSERT_SIZE = 100;

const args = process.argv.slice(2);
const isDryRun  = args.includes('--dry-run');
const startPage = (() => {
  const a = args.find(a => a.startsWith('--page='));
  return a ? parseInt(a.split('=')[1], 10) : 1;
})();

// ── 1. odcloud에서 전체 페이지 수집 ──────────────────────────────────────
interface LotteryStore {
  번호: string;
  상호: string;
  도로명주소: string;
  지번주소: string;
}

async function fetchPage(page: number): Promise<{ data: LotteryStore[]; totalCount: number }> {
  const url = `${ODCLOUD_BASE}?page=${page}&perPage=${PER_PAGE}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Infuser ${ODCLOUD_KEY}` },
  });
  if (!res.ok) throw new Error(`odcloud HTTP ${res.status} (page ${page})`);
  const json = await res.json();
  return {
    data: json.data ?? [],
    totalCount: json.totalCount ?? 0,
  };
}

// ── 2. Kakao 주소 → 좌표 ─────────────────────────────────────────────────
interface GeoResult { lat: number; lng: number; road_address: string }

async function geocode(address: string): Promise<GeoResult | null> {
  if (!address?.trim()) return null;
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;
  try {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } });
    if (!res.ok) return null;
    const json = await res.json();
    const doc = json.documents?.[0];
    if (!doc) return null;
    return {
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      road_address: doc.road_address?.address_name ?? doc.address?.address_name ?? address,
    };
  } catch {
    return null;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── 3. Supabase upsert ────────────────────────────────────────────────────
interface StoreRow {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  road_address: string;
  trust_score: number;
  last_verified_at: string;
  operation_type: string;
  raw_hours: string;
  metadata: Record<string, string>;
}

async function upsertBatch(rows: StoreRow[]) {
  const { error } = await supabase
    .from('stores')
    .upsert(rows, { onConflict: 'name,road_address', ignoreDuplicates: true });
  if (error) console.error('  upsert error:', error.message);
}

// ── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  if (!ODCLOUD_KEY) { console.error('❌ DATA_GO_KR_SERVICE_KEY 없음'); process.exit(1); }
  if (!KAKAO_KEY)   { console.error('❌ KAKAO_REST_API_KEY 없음');      process.exit(1); }

  console.log(`🎰 복권판매점 수집 시작 (page=${startPage}, dry-run=${isDryRun})`);

  // 첫 페이지로 totalCount 확인
  const first = await fetchPage(1);
  const totalPages = Math.ceil(first.totalCount / PER_PAGE);
  console.log(`  → 총 ${first.totalCount}건 / ${totalPages} 페이지`);

  let saved = 0;
  let skipped = 0;
  let batch: StoreRow[] = [];
  const now = new Date().toISOString();

  for (let page = startPage; page <= totalPages; page++) {
    const { data } = page === 1 ? first : await fetchPage(page);
    console.log(`\n📄 page ${page}/${totalPages} (${data.length}건)`);

    for (const item of data) {
      const address = item.도로명주소?.trim() || item.지번주소?.trim();
      if (!address || !item.상호?.trim()) { skipped++; continue; }

      if (isDryRun) {
        console.log(`  [DRY] ${item.상호} | ${address}`);
        if (saved + skipped >= 10) { console.log('\n(dry-run: 10건 후 종료)'); return; }
        saved++;
        continue;
      }

      await sleep(GEOCODE_DELAY_MS);
      const geo = await geocode(address);
      if (!geo) {
        console.log(`  ⚠️  좌표 실패: ${item.상호} | ${address}`);
        skipped++;
        continue;
      }

      batch.push({
        name: item.상호.trim(),
        category: '복권판매점',
        latitude: geo.lat,
        longitude: geo.lng,
        road_address: geo.road_address,
        trust_score: 70,
        last_verified_at: now,
        operation_type: 'REGULAR',
        raw_hours: '영업시간 정보 없음',
        metadata: { source: 'odcloud_lottery', original_address: address },
      });

      if (batch.length >= BATCH_UPSERT_SIZE) {
        await upsertBatch(batch);
        saved += batch.length;
        process.stdout.write(`  💾 ${saved}건 저장됨\r`);
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await upsertBatch(batch);
    saved += batch.length;
  }

  console.log(`\n\n✅ 완료 — 저장: ${saved}건 / 스킵: ${skipped}건`);
  console.log('   카테고리: 복권판매점 | 소스: odcloud I5086355');
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
