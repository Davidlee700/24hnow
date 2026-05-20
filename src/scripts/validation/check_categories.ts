import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function main() {
  const allData: { name: string; category: string; operation_type: string }[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stores')
      .select('name, category, operation_type')
      .range(from, from + 999);
    if (!data?.length) break;
    allData.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 카테고리별 브랜드 집계
  const cats: Record<string, Record<string, { total: number; h24: number; unknown: number; regular: number }>> = {};

  for (const s of allData) {
    const cat = s.category || '기타';
    const name = s.name || '';
    
    // 브랜드 추출 (앞 2~6글자 한글 브랜드명)
    const brandMatch = name.match(/^([가-힣A-Za-z0-9&]+(?:\s?[A-Za-z0-9]+)?)/);
    let brand = brandMatch ? brandMatch[1].slice(0, 10) : name.slice(0, 10);
    
    if (!cats[cat]) cats[cat] = {};
    if (!cats[cat][brand]) cats[cat][brand] = { total: 0, h24: 0, unknown: 0, regular: 0 };
    cats[cat][brand].total++;
    if (s.operation_type === '24H') cats[cat][brand].h24++;
    if (s.operation_type === 'UNKNOWN') cats[cat][brand].unknown++;
    if (s.operation_type === 'REGULAR') cats[cat][brand].regular++;
  }

  // 카테고리 순으로 출력, 각 카테고리는 total 상위 브랜드만
  const catSummary: Record<string, { total: number; h24: number; unknown: number; regular: number }> = {};
  for (const [cat, brands] of Object.entries(cats)) {
    catSummary[cat] = { total: 0, h24: 0, unknown: 0, regular: 0 };
    for (const b of Object.values(brands)) {
      catSummary[cat].total += b.total;
      catSummary[cat].h24 += b.h24;
      catSummary[cat].unknown += b.unknown;
      catSummary[cat].regular += b.regular;
    }
  }

  const sortedCats = Object.entries(catSummary).sort((a, b) => b[1].unknown - a[1].unknown);

  console.log(`\n📊 카테고리별 현황 (UNKNOWN 많은 순, 총 ${allData.length.toLocaleString()}개)\n`);
  for (const [cat, sum] of sortedCats) {
    console.log(`\n[${cat}] 총 ${sum.total}개  24H: ${sum.h24}  REGULAR: ${sum.regular}  UNKNOWN: ${sum.unknown}`);
    
    if (sum.unknown === 0) continue;
    
    // 해당 카테고리 브랜드 top 15
    const brandList = Object.entries(cats[cat])
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15);
    for (const [brand, cnt] of brandList) {
      if (cnt.total < 3) continue;
      console.log(`  ${brand.padEnd(18)} 총 ${String(cnt.total).padStart(4)}  24H: ${cnt.h24}  REG: ${cnt.regular}  UNK: ${cnt.unknown}`);
    }
  }
}

main().catch(console.error);
