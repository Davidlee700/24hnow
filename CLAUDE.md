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
    layout.tsx          — Root layout, SEO 메타데이터, Kakao SDK 로드
    page.tsx            — 메인 페이지 (UI 조합만, 로직은 hook으로 위임)
    globals.css         — 디자인 토큰 (iOS dark, #ADFF2F 네온, glassmorphism)
  components/
    KakaoMap.tsx        — 지도 렌더링, GPS, 마커 (카테고리별 이모지 스타일)
    StoreBottomSheet.tsx — 매장 디테일 바텀시트 (전화, 길찾기, 신고)
  hooks/
    useStores.ts        — Supabase bounds 쿼리 + 클라이언트 dedup + 신고 처리
  types/
    store.ts            — Store, MapBounds 인터페이스 (단일 소스)
  lib/
    supabase.ts         — Supabase 클라이언트 (브라우저용)
  utils/
    trustScore.ts       — 신뢰도 점수 계산 로직
  scripts/
    fetch_kakao.ts      — Kakao API 데이터 수집 (66개 지역, 최대 45건/쿼리)
    fetch_naver.ts      — Naver API 데이터 수집 (66개 지역, 최대 25건/쿼리)
    run_all.ts          — 전체 수집 마스터 스크립트
```

---

## 핵심 규칙

- **Store 타입은 `src/types/store.ts` 단일 소스** — 절대 각 파일에서 재정의하지 않는다.
- **데이터 패칭 로직은 `useStores` hook** — page.tsx는 UI 조합만 담당한다.
- **마커는 CustomOverlay (DOM 요소)** — Kakao Maps API 호출 없음, 추가 과금 없음.
- **인증 구현은 Supabase Auth** — 로그인/커뮤니티 추가 시 `supabase-server.ts` 별도 생성.

---

## 🚫 절대 규칙 (Absolute Rules)

1. **배포의 절대권한**: Production Push는 반드시 사용자의 명시적인 승인 시에만 실행한다.
2. **Apple Soul**: Apple HIG 최우선. 유리(Glass), 계층(Layer), 4배수 여백, 정중하고 간결한 한국어 페르소나.
3. **무결한 모듈화**: Atomic Design 준수, 기능별 컴포넌트 분리, 중복 코드 금지.
4. **물리적 interaction**: 0.1초 단위의 탄성(Elasticity) 있는 애니메이션 (Scale, Opacity, Blur).
5. **데이터 보수성**: 불확실한 정보는 "정보 확인 중" 표기. 허위 데이터(Hallucination) 절대 금지.

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

- [x] 지도 기반 24시 매장 검색 (카페/편의점/셀프세차장)
- [x] 카테고리별 마커, GPS, 길찾기, 신뢰도 신고
- [x] 서울/경기/인천 데이터 수집 + 페이지네이션
- [ ] 로그인 (Supabase Auth + Google OAuth)
- [ ] 커뮤니티 (매장별 리뷰/제보 게시판)
- [ ] 매장 유형 확대 (노래방, 피씨방, 약국, 병원 등)
- [ ] GitHub Actions 주간 자동 수집 cron

---

## 스프린트별 업데이트 기록

| 날짜 | 변경 내용 |
|------|---------|
| 2026-04-27 | 초기 세팅 — 지도, 마커, Supabase 연동 |
| 2026-04-27 | SEO 개선, 디테일창, 길찾기 버그 수정, 카테고리 마커 |
| 2026-04-27 | 소스 구조 정리, 서울/경기/인천 확대, API 페이지네이션 |
