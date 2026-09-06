-- Fix: Rename razorpay columns to stripe, add constraints and indexes

-- Drop old unique constraints first
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_razorpay_subscription_id_key;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_razorpay_invoice_id_key;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_razorpay_payment_id_key;

-- Rename subscriptions columns
ALTER TABLE subscriptions RENAME COLUMN razorpay_subscription_id TO stripe_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN razorpay_plan_id TO stripe_price_id;
ALTER TABLE subscriptions RENAME COLUMN razorpay_customer_id TO stripe_customer_id;

-- Rename invoices columns
ALTER TABLE invoices RENAME COLUMN razorpay_invoice_id TO stripe_invoice_id;
ALTER TABLE invoices RENAME COLUMN razorpay_subscription_id TO stripe_subscription_id;
ALTER TABLE invoices RENAME COLUMN razorpay_payment_id TO stripe_payment_id;

-- Rename payments columns
ALTER TABLE payments RENAME COLUMN razorpay_payment_id TO stripe_payment_id;

-- Add unique constraints on stripe columns
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
ALTER TABLE invoices ADD CONSTRAINT invoices_stripe_invoice_id_key UNIQUE (stripe_invoice_id);
ALTER TABLE payments ADD CONSTRAINT payments_stripe_payment_id_key UNIQUE (stripe_payment_id);

-- Add missing index for conversions
CREATE INDEX IF NOT EXISTS idx_conv_user_created ON conversions(user_id, created_at DESC);
