import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  // 고양시 편의점 전체 operation_type 분포
  const { data: all } = await sb.from('stores')
    .select('operation_type')
    .eq('category', '편의점')
    .like('road_address', '%고양시%');

  const counts: Record<string, number> = {};
  for (const s of all ?? []) counts[s.operation_type] = (counts[s.operation_type] ?? 0) + 1;
  console.log('고양시 편의점 operation_type 분포:', counts);

  // REGULAR/UNKNOWN 샘플
  const { data: nonTwenty } = await sb.from('stores')
    .select('name, operation_type, raw_hours, confidence_level')
    .eq('category', '편의점')
    .like('road_address', '%고양시%')
    .in('operation_type', ['REGULAR', 'EXTENDED', 'UNKNOWN'])
    .limit(10);
  console.log('\n비24시 편의점 샘플:');
  for (const s of nonTwenty ?? []) {
    console.log(`  ${s.name} [${s.operation_type}] raw_hours=${s.raw_hours ?? '없음'}`);
  }
}
main();
