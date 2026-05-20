import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const allData: { name: string; operation_type: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('name, operation_type')
      .eq('category', '편의점')
      .range(from, from + 999);
    if (!data?.length) break;
    allData.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const brands: Record<string, { total: number; h24: number; unknown: number }> = {};

  for (const s of allData) {
    const name: string = s.name || '';
    let brand = '기타';
    if (name.startsWith('CU')) brand = 'CU';
    else if (name.startsWith('GS25')) brand = 'GS25';
    else if (name.startsWith('세븐일레븐')) brand = '세븐일레븐';
    else if (name.startsWith('이마트24')) brand = '이마트24';
    else if (name.startsWith('미니스톱')) brand = '미니스톱';
    else brand = '기타: ' + name.slice(0, 10);

    if (!brands[brand]) brands[brand] = { total: 0, h24: 0, unknown: 0 };
    brands[brand].total++;
    if (s.operation_type === '24H') brands[brand].h24++;
    if (s.operation_type === 'UNKNOWN') brands[brand].unknown++;
  }

  const sorted = Object.entries(brands).sort((a, b) => b[1].total - a[1].total);
  console.log(`\n편의점 브랜드별 현황 (총 ${allData.length.toLocaleString()}개)\n`);
  for (const [brand, cnt] of sorted) {
    console.log(`${brand.padEnd(22)} 총 ${String(cnt.total).padStart(5)}개  24H: ${String(cnt.h24).padStart(4)}개  UNKNOWN: ${cnt.unknown}개`);
  }
}

main().catch(console.error);