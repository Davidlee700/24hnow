const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('road_address, category, name')
    .or('road_address.ilike.%일산서구%,road_address.ilike.%일산동구%,road_address.ilike.%덕양구%');

  if (error) {
    console.error(error);
    return;
  }

  const distribution = {};

  data.forEach(store => {
    const parts = store.road_address.split(' ');
    let gu = '';
    let dong = '';
    
    // Find Gu and Dong
    for (let part of parts) {
      if (part.endsWith('구')) gu = part;
      if (part.endsWith('동')) dong = part;
      if (part.endsWith('읍')) dong = part;
      if (part.endsWith('면')) dong = part;
    }

    if (gu) {
      if (!distribution[gu]) distribution[gu] = { total: 0, dongs: {} };
      distribution[gu].total++;
      
      const dongKey = dong || '기타';
      if (!distribution[gu].dongs[dongKey]) distribution[gu].dongs[dongKey] = { total: 0, categories: {} };
      
      distribution[gu].dongs[dongKey].total++;
      const cat = store.category || '기타';
      if (!distribution[gu].dongs[dongKey].categories[cat]) distribution[gu].dongs[dongKey].categories[cat] = 0;
      distribution[gu].dongs[dongKey].categories[cat]++;
    }
  });

  console.log(JSON.stringify(distribution, null, 2));
}

checkStores();
