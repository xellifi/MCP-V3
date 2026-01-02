-- ============================================
-- Add Google Sheets integration to stores
-- Run this in Supabase SQL Editor
-- ============================================

-- Add column for Google Sheets webhook URL
ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_webhook_url TEXT;

-- Add column for Google Sheet name (e.g., Sheet1, Sheet2, etc.)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_sheet_name TEXT DEFAULT 'Sheet1';
