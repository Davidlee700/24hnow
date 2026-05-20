-- Enable PostGIS extension for spatial queries (location based search)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'cafe', 'restaurant', 'convenience_store'
    road_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location geography(POINT, 4326), -- PostGIS geography point for distance queries
    is_24h BOOLEAN DEFAULT false,
    original_hours TEXT, -- Original operating hours text for reference
    metadata JSONB DEFAULT '{}'::jsonb, -- Raw data from external APIs and parsed info (e.g. sockets, parking)
    last_verified_at TIMESTAMPTZ DEFAULT now(), -- Last time data was verified
    trust_score INTEGER DEFAULT 0, -- Trust score (higher is more reliable)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Data Reliability fields
    confidence_level TEXT, -- 'HIGH', 'MEDIUM', 'LOW'
    business_hours JSONB,
    google_place_id TEXT,
    verification_source TEXT, -- 'GOOGLE', 'HEURISTIC', 'USER'
    -- Hours-aware operation fields
    operation_type TEXT DEFAULT 'UNKNOWN', -- '24H', 'EXTENDED', 'REGULAR', 'UNKNOWN'
    hours_source TEXT, -- 'KAKAO', 'NAVER', 'GOOGLE', 'KAKAO+NAVER', 'ALL' etc.
    last_hours_verified_at TIMESTAMPTZ -- 마지막으로 영업시간을 검증한 시각
);

-- Create spatial index for location-based search
CREATE INDEX IF NOT EXISTS stores_location_idx ON public.stores USING GIST (location);

-- Create index on metadata for fast JSONB querying
CREATE INDEX IF NOT EXISTS stores_metadata_idx ON public.stores USING GIN (metadata);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_reports table for crowdsourced feedback
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id),
    session_id TEXT NOT NULL,
    report_type TEXT NOT NULL, -- 'NOT_24H', 'CLOSED', 'OTHER', 'OPEN', 'WRONG_HOURS'
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying reports efficiently
CREATE INDEX IF NOT EXISTS idx_user_reports_store_id ON public.user_reports(store_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_session_id ON public.user_reports(session_id);

-- ─────────────────────────────────────────────
-- Migration: tags, class_type, has_medicine, store_votes 추가
-- Supabase 대시보드 SQL Editor에서 실행
-- ─────────────────────────────────────────────

-- stores 테이블 누락 컬럼 추가
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tags        TEXT[]   DEFAULT '{}';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS class_type  TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS raw_hours   TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS has_medicine BOOLEAN  DEFAULT false;

-- GIN 인덱스 (tags array contains 쿼리 성능)
CREATE INDEX IF NOT EXISTS idx_stores_tags ON public.stores USING GIN(tags);

-- 태그 투표 테이블
CREATE TABLE IF NOT EXISTS public.store_votes (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID      REFERENCES public.stores(id) ON DELETE CASCADE,
  tag        TEXT      NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_votes_store_id ON public.store_votes(store_id);

-- ─────────────────────────────────────────────
-- Migration: 심야영업점 지원 (operation_type 도입)
-- 기존 DB에 컬럼이 없는 경우 아래 ALTER TABLE 실행
-- ─────────────────────────────────────────────
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'UNKNOWN';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hours_source TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS last_hours_verified_at TIMESTAMPTZ;

-- 기존 is_24h=true 매장을 24H로 백필
UPDATE public.stores SET operation_type = '24H' WHERE is_24h = true AND operation_type = 'UNKNOWN';

-- operation_type 인덱스 (지금 영업중 필터 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_stores_operation_type ON public.stores(operation_type);
CREATE INDEX IF NOT EXISTS idx_stores_last_hours_verified ON public.stores(last_hours_verified_at NULLS FIRST);
