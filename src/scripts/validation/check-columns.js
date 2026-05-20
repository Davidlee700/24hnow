const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .limit(1);

  if (error) {
    console.error(error);
    return;
  }

  console.log(Object.keys(data[0]));
}

checkColumns();
