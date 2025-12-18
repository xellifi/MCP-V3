-- ============================================
-- FIX ADMIN SETTINGS TABLE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Change menu_sequence from text[] to jsonb
ALTER TABLE public.admin_settings 
  ALTER COLUMN menu_sequence TYPE jsonb USING menu_sequence::jsonb;

-- Step 2: Add missing SMTP columns
ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port TEXT,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from_email TEXT;

-- Step 3: Add missing affiliate columns
ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS affiliate_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS affiliate_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS affiliate_min_withdrawal DECIMAL(10,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS affiliate_withdrawal_days INTEGER[] DEFAULT '{1}';

-- Step 4: Ensure default row exists with proper defaults
INSERT INTO public.admin_settings (id, menu_sequence, affiliate_enabled, affiliate_commission, affiliate_currency, affiliate_min_withdrawal, affiliate_withdrawal_days) 
VALUES (
  1, 
  '[]'::jsonb, 
  true, 
  15.00, 
  'USD', 
  100.00, 
  '{1}'
) 
ON CONFLICT (id) DO UPDATE SET
  menu_sequence = COALESCE(admin_settings.menu_sequence, '[]'::jsonb),
  affiliate_enabled = COALESCE(admin_settings.affiliate_enabled, true),
  affiliate_commission = COALESCE(admin_settings.affiliate_commission, 15.00),
  affiliate_currency = COALESCE(admin_settings.affiliate_currency, 'USD'),
  affiliate_min_withdrawal = COALESCE(admin_settings.affiliate_min_withdrawal, 100.00),
  affiliate_withdrawal_days = COALESCE(admin_settings.affiliate_withdrawal_days, '{1}');

-- ============================================
-- DONE! Schema is now fixed
-- ============================================
