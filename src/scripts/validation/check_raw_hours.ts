import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
async function main() {
  // 카페 중 raw_hours 있는 브랜드별 집계
  const allData: { name: string; operation_type: string; raw_hours: string | null }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('name, operation_type, raw_hours')
      .eq('category', '카페')
      .range(from, from + 999);
    if (!data?.length) break;
    allData.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const brands: Record<string, { total: number; hasRaw: number; unknown: number }> = {};
  for (const s of allData) {
    const m = s.name.match(/^([가-힣A-Za-z0-9]+(?:\s?[A-Za-z0-9]+)?)/);
    const brand = m ? m[1].slice(0, 10) : s.name.slice(0, 10);
    if (!brands[brand]) brands[brand] = { total: 0, hasRaw: 0, unknown: 0 };
    brands[brand].total++;
    if (s.raw_hours) brands[brand].hasRaw++;
    if (s.operation_type === 'UNKNOWN') brands[brand].unknown++;
  }

  const sorted = Object.entries(brands)
    .filter(([, v]) => v.total >= 50)
    .sort((a, b) => b[1].total - a[1].total);

  console.log('\n브랜드별 raw_hours 보유율 (50개 이상)\n');
  for (const [brand, cnt] of sorted) {
    const pct = Math.round(cnt.hasRaw / cnt.total * 100);
    console.log(`${brand.padEnd(18)} 총 ${String(cnt.total).padStart(4)}  raw_hours: ${String(cnt.hasRaw).padStart(4)} (${pct}%)  UNKNOWN: ${cnt.unknown}`);
  }
}
main().catch(console.error);
