# 24시 나우 - 밤샘지도 | 아키텍처 문서

> 이 문서는 기능 추가/변경 시 함께 업데이트합니다.
> 마지막 업데이트: 2026-04-27

---

## 서비스 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | 24시 나우 - 밤샘지도 |
| 도메인 | 24now.kr |
| 타겟 | 새벽 카공족, 올빼미족, 야간 근로자 |
| 현재 커버리지 | 서울(25구) + 경기(31시/군) + 인천(10구/군) |
| 카테고리 | 카페, 편의점, 셀프세차장 (확대 예정) |

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| 지도 | Kakao Maps JavaScript SDK v2 |
| Database | Supabase (PostgreSQL + PostGIS) |
| Auth (예정) | Supabase Auth (Google OAuth) |
| 데이터 수집 | Node.js 스크립트 (tsx) |
| 외부 API | Kakao REST API, Naver Open API, Naver Cloud Geocoding |

---

## 데이터 흐름

```
[주 1회 수집]
Kakao/Naver API
  → src/scripts/fetch_kakao.ts / fetch_naver.ts
  → Supabase stores 테이블 (upsert, dedup by name+road_address)

[실시간 서비스]
사용자 지도 이동
  → useStores hook (bounds 기반 Supabase 쿼리)
  → KakaoMap CustomOverlay 마커 렌더링
  → 마커 클릭 → StoreBottomSheet 표시
  → 신고 버튼 → Supabase trust_score 업데이트
```

---

## Supabase 스키마 (stores 테이블)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | TEXT | 매장명 |
| category | TEXT | 카페 / 편의점 / 셀프세차장 |
| road_address | TEXT | 도로명 주소 |
| latitude | FLOAT | 위도 |
| longitude | FLOAT | 경도 |
| is_24h | BOOLEAN | 24시 운영 여부 |
| trust_score | INTEGER | 신뢰도 0~100 |
| last_verified_at | TIMESTAMPTZ | 마지막 확인일 |
| metadata | JSONB | phone, place_url, source 등 |
| created_at | TIMESTAMPTZ | 생성일 |

**중복 제거 키**: `(name, road_address)` unique constraint

---

## 마커 스타일 (카테고리별)

| 카테고리 | 이모지 | 색상 | 신뢰도 낮으면 |
|---------|--------|------|------------|
| 카페 | ☕ | #B07B40 (갈색) | opacity 0.5 |
| 편의점 | 🏪 | #0A84FF (파랑) | opacity 0.5 |
| 셀프세차장 | 🚗 | #30D158 (초록) | opacity 0.5 |

신뢰도 > 60: 색상 glow 효과 추가

---

## 신뢰도(trust_score) 로직

- **Kakao API 수집**: 기본 85점
- **Naver API 수집**: 기본 80점
- **사용자 "운영중" 신고**: +10점 (최대 100)
- **사용자 "폐업" 신고**: -30점 (최소 0)
- **30일 미확인**: -30점 (trustScore.ts 참조)

---

## 개발 로드맵

### 완료
- [x] 지도 기반 24시 매장 검색
- [x] GPS 현재 위치, 길찾기(현재위치→매장)
- [x] 카테고리별 마커, 신뢰도 신고
- [x] SEO 최적화 (24now.kr, 실검 키워드)
- [x] 서울/경기/인천 데이터 수집 + 페이지네이션
- [x] 소스 구조 정리 (types, hooks, components 분리)

### 예정
- [ ] **로그인** — Supabase Auth + Google OAuth
  - `src/app/(auth)/login/page.tsx`
  - `src/lib/supabase-server.ts` (서버사이드 클라이언트)
- [ ] **커뮤니티** — 매장별 리뷰/제보 게시판
  - `src/app/(community)/` Route Group
  - Supabase `posts`, `comments` 테이블
- [ ] **매장 유형 확대** — 노래방, PC방, 약국, 편의점 ATM 등
- [ ] **GitHub Actions 자동 수집** — 매주 일요일 자정 cron
- [ ] **PWA** — 앱 설치, 푸시 알림

---

