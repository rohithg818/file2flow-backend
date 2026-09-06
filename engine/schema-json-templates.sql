-- JSON Templates Cache for Groq-generated HTML templates
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS json_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  structural_hash TEXT NOT NULL UNIQUE,
  html_template TEXT NOT NULL,
  sample_keys JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_json_templates_hash ON json_templates(structural_hash);

-- Service role full access
ALTER TABLE json_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON json_templates
  FOR ALL USING (true) WITH CHECK (true);
