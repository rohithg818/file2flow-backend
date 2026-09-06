-- Paddle Billing Migration for File2Flow
-- Run in Supabase SQL Editor

-- Add Paddle columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS conversions_used_this_month INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_reset_date TIMESTAMPTZ DEFAULT NOW();

-- Index for paddle lookups
CREATE INDEX IF NOT EXISTS idx_users_paddle_customer ON users(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_paddle_subscription ON users(paddle_subscription_id);
