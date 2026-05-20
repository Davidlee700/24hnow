import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
async function main() {
  // 스키마 컬럼 확인
  const { data } = await supabase.from('stores').select('*').limit(1);
  if (data?.[0]) console.log('컬럼 목록:', Object.keys(data[0]).join(', '));
  
  // business_hours가 있는 샘플
  const { data: bh } = await supabase
    .from('stores')
    .select('name, operation_type, business_hours, raw_hours')
    .not('business_hours', 'is', null)
    .limit(3);
  console.log('\nbusiness_hours 있는 샘플:', JSON.stringify(bh, null, 2));
  
  // raw_hours 있는 샘플
  const { data: rh } = await supabase
    .from('stores')
    .select('name, raw_hours')
    .not('raw_hours', 'is', null)
    .limit(3);
  console.log('\nraw_hours 샘플:', JSON.stringify(rh, null, 2));
}
main().catch(console.error);
