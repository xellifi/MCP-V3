-- ============================================
-- FIX PACKAGES TABLE RLS POLICIES
-- Run this in your Supabase SQL Editor to enable package creation
-- ============================================

-- First, check if RLS is enabled
-- ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict (optional, be careful)
-- DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
-- DROP POLICY IF EXISTS "Anyone can view packages" ON public.packages;

-- Allow anyone to read packages (for pricing page, etc.)
CREATE POLICY IF NOT EXISTS "Public can view active packages" 
ON public.packages 
FOR SELECT 
USING (is_active = true OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);

-- Allow admins/owners to insert packages
CREATE POLICY IF NOT EXISTS "Admins can create packages" 
ON public.packages 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);

-- Allow admins/owners to update packages
CREATE POLICY IF NOT EXISTS "Admins can update packages" 
ON public.packages 
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);

-- Allow admins/owners to delete packages
CREATE POLICY IF NOT EXISTS "Admins can delete packages" 
ON public.packages 
FOR DELETE 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);

-- Alternative: Full access for admins (simpler, single policy)
-- Uncomment this if the individual policies above don't work
/*
DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can create packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can update packages" ON public.packages;
DROP POLICY IF EXISTS "Admins can delete packages" ON public.packages;

CREATE POLICY "Admins have full access to packages" 
ON public.packages 
FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'owner', 'OWNER'))
);

CREATE POLICY "Anyone can read packages" 
ON public.packages 
FOR SELECT 
USING (true);
*/

-- ============================================
-- DONE! Packages RLS fixed
-- ============================================
