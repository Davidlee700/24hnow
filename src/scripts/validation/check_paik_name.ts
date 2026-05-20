import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
async function main() {
  const oneHourAgo = new Date(Date.now() - 60*60*1000).toISOString();
  const { count } = await supabase.from('stores').select('*',{count:'exact',head:true})
    .ilike('name','컴포즈커피%').gte('last_hours_verified_at', oneHourAgo);
  console.log('컴포즈커피 이번 실행 업데이트:', count);
  const { count: total } = await supabase.from('stores').select('*',{count:'exact',head:true})
    .ilike('name','컴포즈커피%').not('raw_hours','is',null);
  console.log('컴포즈커피 raw_hours 총계:', total);
}
main().catch(console.error);
