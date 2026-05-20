import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
async function main() {
  const { data } = await supabase.from('stores').select('name, road_address').eq('category','카페').ilike('name','%이디야%').limit(5);
  console.log(data);
}
main().catch(console.error);
