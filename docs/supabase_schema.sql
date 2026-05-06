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
    verification_source TEXT -- 'GOOGLE', 'HEURISTIC', 'USER'
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
