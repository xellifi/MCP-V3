-- ============================================
-- COMPLETE FIX FOR ADMIN SETTINGS
-- Run this in Supabase SQL Editor
-- This fixes both schema issues and RLS policies
-- ============================================

-- PART 1: FIX TABLE SCHEMA
-- ============================================

-- Step 1: Drop the default value for menu_sequence first
ALTER TABLE public.admin_settings 
  ALTER COLUMN menu_sequence DROP DEFAULT;

-- Step 2: Change menu_sequence from text[] to jsonb (proper conversion)
ALTER TABLE public.admin_settings 
  ALTER COLUMN menu_sequence TYPE jsonb USING array_to_json(menu_sequence)::jsonb;

-- Step 3: Set new default value for menu_sequence as jsonb
ALTER TABLE public.admin_settings 
  ALTER COLUMN menu_sequence SET DEFAULT '[]'::jsonb;

-- Step 4: Add missing SMTP columns
ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS smtp_host TEXT,
  ADD COLUMN IF NOT EXISTS smtp_port TEXT,
  ADD COLUMN IF NOT EXISTS smtp_user TEXT,
  ADD COLUMN IF NOT EXISTS smtp_password TEXT,
  ADD COLUMN IF NOT EXISTS smtp_from_email TEXT;

-- Step 5: Add missing affiliate columns
ALTER TABLE public.admin_settings 
  ADD COLUMN IF NOT EXISTS affiliate_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS affiliate_commission DECIMAL(10,2) DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS affiliate_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS affiliate_min_withdrawal DECIMAL(10,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS affiliate_withdrawal_days INTEGER[] DEFAULT '{1}';

-- Step 6: Ensure default row exists with proper defaults
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

-- PART 2: FIX RLS POLICIES
-- ============================================

-- Drop ALL existing policies for admin_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated can read admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.admin_settings;

-- Allow all authenticated users to read admin settings (needed for webhook verification)
CREATE POLICY "Authenticated can read admin settings" ON public.admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to update admin settings (case-insensitive role check)
CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(role) IN ('admin', 'owner')
    )
  );

-- Allow admins to insert admin settings (case-insensitive role check)
CREATE POLICY "Admins can insert settings" ON public.admin_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND LOWER(role) IN ('admin', 'owner')
    )
  );

-- PART 3: VERIFY ADMIN USER ROLE
-- ============================================

-- Check current user's role (uncomment to run)
-- SELECT id, email, role FROM public.profiles WHERE id = auth.uid();

-- If your role is not 'admin' or 'owner', update it (uncomment and modify email):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@mychatpilot.com';

-- ============================================
-- DONE! All fixes applied
-- Refresh your application and try saving again
-- ============================================
