import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function normalize(raw: string): string {
  let a = raw.split(',')[0];
  a = a.replace(/\(.*?\)/g, '');
  a = a.replace(/(\d+(?:-\d+)?) +[가-힣A-Z].+$/, '$1');
  return a.replace(/\s+/g, ' ').trim();
}

async function main() {
  const cuSamples = [
    '서울특별시 강남구 도산대로 529',
    '서울특별시 강남구 논현로 201',
    '서울특별시 강남구 논현로151길 52',
    '서울특별시 강남구 봉은사로 439',
    '서울특별시 강남구 봉은사로 129',
  ];

  const { data } = await sb.from('stores').select('name, road_address').eq('category', '편의점').ilike('road_address', '%강남구%').like('name', 'CU%').limit(20);
  console.log(`DB 강남구 CU: ${data?.length}개`);
  data?.slice(0, 5).forEach((d: any) => {
    console.log(`  ${d.name} | 원본: ${d.road_address}`);
    console.log(`  정규화: ${normalize(d.road_address || '')}`);
  });

  console.log('\n--- CU 웹사이트 vs DB 매칭 ---');
  const dbNorms = new Map((data || []).map((d: any) => [normalize(d.road_address || ''), d.name]));
  for (const cuAddr of cuSamples) {
    const match = dbNorms.get(cuAddr);
    // startsWith 매칭도 시도
    let swMatch = '';
    for (const [dbAddr, name] of dbNorms) {
      if (cuAddr.startsWith(dbAddr) && dbAddr.length > 10) { swMatch = `SW: ${name}`; break; }
      if (dbAddr.startsWith(cuAddr) && cuAddr.length > 10) { swMatch = `SW: ${name}`; break; }
    }
    console.log(`CU: ${cuAddr}`);
    console.log(`  완전: ${match || '없음'} | ${swMatch || '없음'}`);
  }
}
main().catch(console.error);
