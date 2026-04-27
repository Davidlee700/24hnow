/**
 * 전체 데이터 수집 마스터 스크립트
 * 권장 실행 주기: 주 1회 (일요일 자정)
 *
 * 사용법:
 *   npm run ingest          — Kakao + Naver 순차 실행
 *   npm run ingest:kakao    — Kakao만 실행
 *   npm run ingest:naver    — Naver만 실행
 *
 * API 무료 한도 (주 1회 실행 기준):
 *   Kakao REST API:     ~600 calls  / 300,000 일 한도 (0.2%)
 *   Naver 검색 API:    ~1,000 calls / 25,000 일 한도  (4%)
 *   Naver Geocoding:  ~3,000 calls / 200,000 월 한도  (1.5%)
 */

import { execSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');

function run(script: string) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`▶ Running: ${script}`);
  console.log('='.repeat(50));
  execSync(`npx tsx "${path.join(root, 'src/scripts', script)}"`, {
    stdio: 'inherit',
    cwd: root,
  });
}

(async () => {
  const start = Date.now();
  console.log(`\n🌙 24시 나우 - 밤샘지도 데이터 수집 시작`);
  console.log(`   ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  run('fetch_kakao.ts');
  run('fetch_naver.ts');

  const elapsed = Math.round((Date.now() - start) / 1000 / 60);
  console.log(`\n🎉 전체 수집 완료! (소요시간: 약 ${elapsed}분)`);
})();
