/**
 * 전체 데이터 수집 마스터 스크립트 v2
 * 카테고리별 전수 조사(PC방, 카페, 세차장, 편의점) + 공공 API(약국)
 */

import { execSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');

function run(script: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`▶ Running: ${script}`);
  console.log('='.repeat(50));
  try {
    execSync(`npx tsx "${path.join(root, 'src/scripts', script)}"`, {
      stdio: 'inherit',
      cwd: root,
    });
  } catch (e) {
    console.error(`❌ ${script} 실행 중 오류 발생`);
  }
}

(async () => {
  const start = Date.now();
  console.log(`\n🌙 24시나우 - 밤샘지도 전체 데이터 수집 (v2) 시작`);
  console.log(`   ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  // 1. 카페, 편의점, 세차장, PC방 (v2 로직)
  run('ingest_v2.ts');

  // 2. 약국 (공공데이터포털 API)
  run('fetch_pharmacy.ts');

  const elapsed = Math.round((Date.now() - start) / 1000 / 60);
  console.log(`\n🎉 전체 수집 완료! (총 소요시간: 약 ${elapsed}분)`);
})();
