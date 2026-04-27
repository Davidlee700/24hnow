import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY;

const TARGET_REGIONS = [
  { q0: '서울특별시', q1: '' }, // Seoul districts will be fetched individually or as a whole
  { q0: '경기도', q1: '' },
  { q0: '인천광역시', q1: '' }
];

async function fetchPharmacies(q0: string, q1: string = '') {
  const url = `http://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getPharmacyListInfoInqire?serviceKey=${SERVICE_KEY}&Q0=${encodeURIComponent(q0)}&Q1=${encodeURIComponent(q1)}&numOfRows=1000&_type=json`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.response?.body?.items?.item;
    return Array.isArray(items) ? items : items ? [items] : [];
  } catch (e) {
    console.error(`Pharmacy API Error (${q0} ${q1}):`, e);
    return [];
  }
}

function checkIsLateNight(p: any): boolean {
  // Check if any day ends at or after 24:00 (midnight)
  for (let i = 1; i <= 7; i++) {
    const endTime = p[`dutyTime${i}e`];
    if (endTime && parseInt(endTime) >= 2400) return true;
  }
  return false;
}

function formatHours(p: any): string {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  let hours = '';
  for (let i = 1; i <= 7; i++) {
    const s = p[`dutyTime${i}s`];
    const e = p[`dutyTime${i}e`];
    if (s && e) hours += `${days[i-1]}: ${s}-${e} `;
  }
  return hours.trim();
}

async function run() {
  console.log('🚀 Pharmacy(약국) 데이터 수집 시작 (E-Gen API)');

  for (const region of TARGET_REGIONS) {
    console.log(`\n🔍 ${region.q0} 약국 데이터 요청 중...`);
    const items = await fetchPharmacies(region.q0, region.q1);
    console.log(`   → 총 ${items.length}개 약국 발견`);

    let savedCount = 0;
    for (const p of items) {
      const isLateNight = checkIsLateNight(p);
      
      // 심야 운영 약국만 저장 (자정 이후까지 영업)
      if (!isLateNight) continue;

      const { data: existing } = await supabase
        .from('stores')
        .select('id')
        .eq('name', p.dutyName)
        .eq('road_address', p.dutyAddr)
        .maybeSingle();

      const hours = formatHours(p);
      const { class_type } = { class_type: 'A' }; // Official API data is Class A

      const payload = {
        name: p.dutyName,
        category: '약국',
        road_address: p.dutyAddr,
        latitude: parseFloat(p.wgs84Lat),
        longitude: parseFloat(p.wgs84Lon),
        is_24h: hours.includes('2400') || hours.includes('0000'), // Strictly 24h
        class_type: isLateNight ? 'A' : 'B',
        raw_hours: hours,
        inference_note: '공공데이터포털(E-Gen) 공식 데이터',
        metadata: {
          phone: p.dutyTel1 || null,
          hpid: p.hpid,
          source: 'e_gen_api'
        },
        last_verified_at: new Date().toISOString(),
        trust_score: 95
      };

      if (existing) {
        await supabase.from('stores').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('stores').insert(payload);
      }
      savedCount++;
    }
    console.log(`   ✅ ${savedCount}개의 심야 약국 저장 완료`);
  }

  console.log('\n✨ 약국 수집 완료!');
}

run();
