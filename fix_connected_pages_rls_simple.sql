-- Simple Fix for Connected Pages RLS
-- Run this in Supabase SQL Editor

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can manage their pages" ON public.connected_pages;
DROP POLICY IF EXISTS "Users can view their pages" ON public.connected_pages;
DROP POLICY IF EXISTS "Users can create pages" ON public.connected_pages;
DROP POLICY IF EXISTS "Users can update pages" ON public.connected_pages;
DROP POLICY IF EXISTS "Users can delete pages" ON public.connected_pages;

-- Create a simple ALL policy for authenticated users
CREATE POLICY "Authenticated users can manage pages" ON public.connected_pages
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'connected_pages';
