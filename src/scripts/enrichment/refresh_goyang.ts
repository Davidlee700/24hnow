import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function refreshGoyang() {
  console.log('Refreshing timestamps for Goyang-si...');
  const { data, error } = await supabase
    .from('stores')
    .update({ last_verified_at: new Date().toISOString() })
    .like('road_address', '%고양시%')
    .not('google_place_id', 'is', null);

  if (error) console.error('Error:', error);
  else console.log('Successfully refreshed Goyang-si stores!');
}

refreshGoyang();
