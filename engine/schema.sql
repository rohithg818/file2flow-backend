-- File2Flow Supabase Schema
-- Run in Supabase SQL Editor
-- Uses Firebase Auth UID as user_id across all tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  account_type TEXT DEFAULT 'individual',
  plan TEXT DEFAULT 'free',
  conversions_limit_per_month INTEGER DEFAULT 10,
  conversions_used_this_month INTEGER DEFAULT 0,
  conversions_count INTEGER DEFAULT 0,
  monthly_reset_date TIMESTAMPTZ DEFAULT NOW(),
  storage_limit BIGINT DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  history_retention_days INTEGER DEFAULT 0,
  is_permanent_storage BOOLEAN DEFAULT FALSE,
  subscription_status TEXT DEFAULT 'none',
  subscription_plan TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  renewal_date TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_payment_date TIMESTAMPTZ,
  failed_payment_attempts INTEGER DEFAULT 0,
  auth_providers TEXT[] DEFAULT ARRAY['password'],
  email_verified BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'dark',
  email_notifications BOOLEAN DEFAULT TRUE,
  email_notification_type TEXT DEFAULT 'all',
  newsletter BOOLEAN DEFAULT FALSE,
  gstin_status TEXT DEFAULT 'none',
  gstin TEXT,
  business_name TEXT,
  pan TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referral_earnings NUMERIC(10,2) DEFAULT 0,
  api_key TEXT UNIQUE,
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS 'BEGIN NEW.updated_at = NOW(); RETURN NEW; END;'
LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. CONVERSIONS
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  user_plan TEXT DEFAULT 'free',
  original_file_name TEXT NOT NULL,
  original_format TEXT NOT NULL,
  original_size BIGINT DEFAULT 0,
  from_format TEXT DEFAULT '',
  to_format TEXT DEFAULT 'pdf',
  output_format TEXT DEFAULT 'pdf',
  output_file_name TEXT DEFAULT '',
  output_size BIGINT DEFAULT 0,
  page_count INTEGER DEFAULT 1,
  storage_path_input TEXT,
  storage_path_output TEXT,
  storage_url_input TEXT,
  storage_url_output TEXT,
  download_url TEXT,
  download_url_expiry TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  conversion_time_ms INTEGER DEFAULT 0,
  downloaded_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  searchable_file_name TEXT DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  settings JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_conv_user ON conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_created ON conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_user_created ON conversions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_expires ON conversions(expires_at) WHERE expires_at IS NOT NULL;

-- 3. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);

-- 4. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  amount_due NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'issued',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invoice_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  description TEXT DEFAULT '',
  item_name TEXT DEFAULT '',
  item_quantity INTEGER DEFAULT 1,
  item_unit_price NUMERIC(10,2) DEFAULT 0,
  customer_email TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  gst_amount NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  invoice_pdf_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_inv_user ON invoices(user_id);

-- 5. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  stripe_payment_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'succeeded',
  method TEXT DEFAULT 'card',
  card_last4 TEXT,
  card_brand TEXT,
  upi_id TEXT,
  email TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  captured_at TIMESTAMPTZ,
  description TEXT DEFAULT '',
  invoice_id TEXT,
  subscription_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_pay_user ON payments(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — ENABLED
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = uid);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = uid);

-- Conversions: users can only access their own
CREATE POLICY "Users can view own conversions" ON conversions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own conversions" ON conversions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own conversions" ON conversions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own conversions" ON conversions
  FOR DELETE USING (auth.uid()::text = user_id);

-- Subscriptions: users can only access their own
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Invoices: users can only access their own
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Payments: users can only access their own
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Service role bypass (for server-side operations using service_role key)
CREATE POLICY "Service role full access" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON conversions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON payments
  FOR ALL USING (true) WITH CHECK (true);

-- Helper function for atomic quota updates
CREATE OR REPLACE FUNCTION increment_user_quot(p_uid TEXT, p_conversions INTEGER, p_storage BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET
    conversions_used_this_month = conversions_used_this_month + p_conversions,
    conversions_count = conversions_count + p_conversions,
    storage_used = storage_used + p_storage,
    last_activity_at = NOW()
  WHERE uid = p_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
