@AGENTS.md
@RULES.md

# 24시 나우 - 밤샘지도 | 프로젝트 가이드

서울/경기/인천의 24시간 운영 카페·편의점·셀프세차장을 지도에서 찾아주는 서비스.
도메인: `24now.kr` | 스택: Next.js 16 / Supabase / Kakao Maps SDK

---

## 디렉토리 구조

```
src/
  app/
    layout.tsx, page.tsx, globals.css
    auth/callback/page.tsx
    guide/[slug]/page.tsx
    stores/[id]/page.tsx
    api/admin/{messages,pages,reports,stores,users}/route.ts
  components/
    KakaoMap.tsx            — 지도 렌더링, GPS, 마커 (CustomOverlay DOM)
    StoreBottomSheet.tsx    — 매장 디테일 바텀시트 (전화, 길찾기, GA 트래킹)
    StoreReviews.tsx        — 리뷰/태그 컴포넌트
    AdBanner.tsx            — Google AdSense 래퍼 (lazy)
  hooks/
    useStores.ts            — Supabase bounds 쿼리 + dedup + 신고 처리
    useTagVotes.ts, useBookmarks.ts
  lib/
    supabase.ts             — 브라우저 클라이언트
    supabase-admin.ts       — 서버 서비스롤 클라이언트 (서버 컴포넌트/API 전용)
    guide-data.ts
    franchise-constants.ts  — FRANCHISE_DEFAULTS 단일 소스
  types/store.ts            — Store, MapBounds 인터페이스 (단일 소스)
  utils/trustScore.ts, openHours.ts
  scripts/
    ingestion/   — fetch_*.ts, run_all.ts, ingest_v2.ts, regions*.ts
    enrichment/  — enrich_*.ts, update_*.ts, refresh_*.ts, match_medicine.ts
    validation/  — check_*.ts, diag_*.ts, *.js
```

---

## 핵심 원칙
> 상세 지침은 `RULES.md` 참조.

- **Apple 관점 우선**: 디자인·개발·운영·마케팅·UX 모든 의사결정에 Apple HIG 적용.
  사용자와의 접점(UI 문구, 에러 메시지, SEO 카피, 광고 배치, 데이터 표시)은 전부 Apple식 정중함·간결함·명료함 기준으로 판단한다.
- **Store 타입은 `src/types/store.ts` 단일 소스** — 각 파일 재정의 금지.
- **데이터 패칭은 `useStores` hook** — page.tsx는 UI 조합만.
- **마커는 CustomOverlay (DOM)** — Kakao Maps API 호출 없음, 과금 없음.
- **배포는 명시적 승인 시에만** — "배포해줘" / "Push" 워딩 필요.

---

## API 제한 & 수집 주기

| API | 무료 한도 | 주 1회 수집량 |
|-----|----------|------------|
| Kakao REST (수집) | 300,000 calls/일 | ~600 calls |
| Kakao Maps SDK (서비스) | 300,000 pageloads/일 | 사용자 수 |
| Naver 검색 (수집) | 25,000 calls/일 | ~1,000 calls |
| Naver Geocoding (수집) | 200,000 calls/월 | ~3,000 calls |
| Supabase (서비스) | 5GB 대역폭/월 | 사용자 수 비례 |

**데이터 수집은 주 1회** 권장 (`npm run ingest`).
서비스 지도 마커 렌더링은 API 과금 없음.

---

## 로컬 실행

```bash
npm run dev              # 개발 서버
npm run ingest           # Kakao + Naver 전체 수집 (주 1회)
npm run ingest:kakao     # Kakao만 수집
npm run ingest:naver     # Naver만 수집
```

---

## 개발 로드맵

### 완료
- [x] 지도 기반 24시 매장 검색 (카페/편의점/셀프세차장)
- [x] 카테고리별 마커, GPS, 길찾기, 신뢰도 신고
- [x] 서울/경기/인천 + 전국 심야가이드 데이터 수집
- [x] Google AdSense 컴포넌트 연동 (가이드·매장 상세 페이지)
- [x] 어드민 API 라우트 5종 (messages, pages, reports, stores, users)
- [x] GA 이벤트 트래킹 + glassmorphism 디자인 토큰 통일

### 진행 중
- [ ] 로그인 — Supabase Auth + Kakao OAuth (콘솔 설정 완료, 코드 미완)

### 예정
- [ ] 커뮤니티 (매장별 리뷰/제보 게시판)
- [ ] 매장 유형 확대 (노래방, PC방, 약국, 병원 등)
- [ ] GitHub Actions 주간 자동 수집 cron

---

| 마지막 업데이트 | 2026-05-21 |
|---|---|
| 주요 변경 | AdSense 연동, 어드민 API, 심야가이드 전국 확대, glassmorphism 디자인 토큰 통일 |
