-- ============================================
-- FIX ADMIN SETTINGS RLS POLICIES
-- Run this in Supabase SQL Editor
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

-- Ensure the default row exists
INSERT INTO public.admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFY YOUR ADMIN USER ROLE
-- ============================================
-- Run this to check your current user's role:
-- SELECT id, email, role FROM public.profiles WHERE id = auth.uid();

-- If your role is not 'admin' or 'owner', update it:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@mychatpilot.com';

-- ============================================
-- DONE! Refresh the page and try again
-- ============================================
