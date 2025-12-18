-- Comprehensive Fix for Meta Connections RLS
-- This script completely resets and recreates all RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE public.meta_connections DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can manage their connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can view their connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can create connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can update connections" ON public.meta_connections;
DROP POLICY IF EXISTS "Users can delete connections" ON public.meta_connections;

-- Step 3: Re-enable RLS
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new policies with explicit permissions

-- Policy 1: Allow authenticated users to SELECT their own connections
CREATE POLICY "Users can view their connections" ON public.meta_connections
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy 2: Allow authenticated users to INSERT connections for their workspaces
CREATE POLICY "Users can create connections" ON public.meta_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policy 3: Allow authenticated users to UPDATE their connections
CREATE POLICY "Users can update connections" ON public.meta_connections
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

-- Policy 4: Allow authenticated users to DELETE their connections
CREATE POLICY "Users can delete connections" ON public.meta_connections
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Step 5: Verify the policies were created
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
WHERE tablename = 'meta_connections'
ORDER BY policyname;

-- Step 6: Test if the current user can insert (optional - for debugging)
-- Uncomment the lines below to test if you can insert a test record
-- DO $$
-- DECLARE
--   test_workspace_id UUID;
-- BEGIN
--   -- Get the first workspace owned by the current user
--   SELECT id INTO test_workspace_id 
--   FROM public.workspaces 
--   WHERE owner_id = auth.uid() 
--   LIMIT 1;
--   
--   IF test_workspace_id IS NOT NULL THEN
--     RAISE NOTICE 'Found workspace: %', test_workspace_id;
--     -- Try to insert a test connection
--     INSERT INTO public.meta_connections (workspace_id, platform, name, external_id, status)
--     VALUES (test_workspace_id, 'TEST', 'Test Connection', 'test123', 'ACTIVE');
--     RAISE NOTICE 'Test insert successful!';
--     -- Clean up the test record
--     DELETE FROM public.meta_connections WHERE external_id = 'test123';
--   ELSE
--     RAISE NOTICE 'No workspace found for current user';
--   END IF;
-- END $$;
