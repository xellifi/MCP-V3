-- ============================================
-- FIX: Add DELETE policy for profiles table
-- This allows admins to delete users from the admin panel
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create DELETE policy for admins
-- Only users with 'admin' or 'owner' role can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================
-- DONE! Run this in Supabase SQL Editor
-- ============================================
