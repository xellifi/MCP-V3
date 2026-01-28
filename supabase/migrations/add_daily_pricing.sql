-- Migration: Add daily pricing columns to packages table
-- This enables "sachet packages" with custom day-based durations (1-30 days)

-- Add price_daily column for the daily/sachet price
ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_daily NUMERIC DEFAULT 0;

-- Add duration_days column for the number of days (1-30)
-- NULL means it's not a daily package
ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT NULL;

-- Add a check constraint to ensure duration_days is between 1 and 30 when set
ALTER TABLE packages ADD CONSTRAINT check_duration_days 
  CHECK (duration_days IS NULL OR (duration_days >= 1 AND duration_days <= 30));
