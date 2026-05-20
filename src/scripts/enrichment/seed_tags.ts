/**
 * 기존 stores 13만 건에 규칙 기반 초기 태그 일괄 세팅
 * 실행: npm run seed:tags
 *
 * stores.tags 컬럼이 없으면 먼저 docs/supabase_schema.sql의 migration 블록을 실행하세요.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { inferTags } from '../../lib/tag-rules';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAGE_SIZE = 300;

async function run() {
  console.log('🏷️  seed_tags 시작 — 규칙 기반 초기 태그 세팅');

  let from = 0;
  let totalUpdated = 0;

  while (true) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, category')
      .range(from, from + PAGE_SIZE - 1);

    if (error) { console.error('fetch error:', error.message); break; }
    if (!data || data.length === 0) break;

    for (const store of data) {
      const tags = inferTags(store.name, store.category);
      if (tags.length === 0) continue;

      const { error: updateErr } = await supabase
        .from('stores')
        .update({ tags })
        .eq('id', store.id);

      if (updateErr) {
        console.error(`  ❌ ${store.name}:`, updateErr.message);
      } else {
        totalUpdated++;
      }
    }

    console.log(`  → ${from + data.length}건 처리 완료 (누적 태그 세팅: ${totalUpdated}건)`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ 완료 — ${totalUpdated}개 매장에 태그 세팅됨`);
}

run();
