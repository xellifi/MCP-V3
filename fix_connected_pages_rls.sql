-- Fix RLS Policies for Connected Pages
-- This allows authenticated users to save fetched Facebook pages
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily
ALTER TABLE public.connected_pages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policy
DROP POLICY IF EXISTS "Users can manage their pages" ON public.connected_pages;

-- Step 3: Re-enable RLS
ALTER TABLE public.connected_pages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create separate policies for each operation

-- Policy 1: Allow authenticated users to SELECT their pages
CREATE POLICY "Users can view their pages" ON public.connected_pages
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy 2: Allow authenticated users to INSERT pages for their workspaces
CREATE POLICY "Users can create pages" ON public.connected_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy 3: Allow authenticated users to UPDATE their pages
CREATE POLICY "Users can update pages" ON public.connected_pages
  FOR UPDATE
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

-- Policy 4: Allow authenticated users to DELETE their pages
CREATE POLICY "Users can delete pages" ON public.connected_pages
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Step 5: Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'connected_pages'
ORDER BY policyname;
