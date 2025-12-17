-- Fix RLS Policy for Webhook Verification
-- This allows the Netlify webhook function to read the verify token
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow anonymous read for webhook" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;

-- Create new policy: Allow anyone to READ (needed for webhook)
CREATE POLICY "Allow anonymous read for webhook" ON public.admin_settings
  FOR SELECT 
  USING (true);

-- Create policy: Only admins can UPDATE
CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Note: We don't need INSERT policy because admin_settings has only 1 row (id=1)
-- that was created by the initial schema setup

-- Verify the policies were created
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'admin_settings';

