-- ============================================================
-- USAGE GATE TABLES (run in Supabase SQL Editor)
-- ============================================================

-- Anonymous usage tracking (4 total uses, no login required)
CREATE TABLE IF NOT EXISTS anon_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  anon_id text NOT NULL,
  ip_address text,
  feature text NOT NULL DEFAULT 'json_to_pdf',
  use_count integer NOT NULL DEFAULT 0,
  first_used_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(anon_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_anon_usage_anon_id ON anon_usage(anon_id);

-- Daily usage tracking for logged-in free-tier users (8/day)
CREATE TABLE IF NOT EXISTS daily_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY KEY,
  user_id text NOT NULL,
  feature text NOT NULL DEFAULT 'json_to_pdf',
  use_date date NOT NULL DEFAULT CURRENT_DATE,
  use_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, feature, use_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, use_date);

-- RLS: only service role should access these tables
ALTER TABLE anon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
