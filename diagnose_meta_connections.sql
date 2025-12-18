-- Diagnostic Script for Meta Connections RLS Issues
-- Run this in Supabase SQL Editor to diagnose the problem
-- This will help identify what's blocking the INSERT operation

-- 1. Check current RLS policies
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

-- 2. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'meta_connections';

-- 3. Check current user's workspaces
SELECT 
  id,
  name,
  owner_id,
  created_at
FROM public.workspaces
WHERE owner_id = auth.uid();

-- 4. Check existing connections
SELECT 
  id,
  workspace_id,
  platform,
  name,
  external_id,
  status,
  created_at
FROM public.meta_connections
WHERE workspace_id IN (
  SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
);

-- 5. Check if current user is authenticated
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 6. Test INSERT permission (this will fail if RLS is blocking)
-- Uncomment to test:
-- DO $$
-- DECLARE
--   test_workspace_id UUID;
-- BEGIN
--   SELECT id INTO test_workspace_id 
--   FROM public.workspaces 
--   WHERE owner_id = auth.uid() 
--   LIMIT 1;
--   
--   IF test_workspace_id IS NOT NULL THEN
--     RAISE NOTICE 'Testing INSERT with workspace_id: %', test_workspace_id;
--     INSERT INTO public.meta_connections (
--       workspace_id, 
--       platform, 
--       name, 
--       external_id, 
--       status
--     )
--     VALUES (
--       test_workspace_id, 
--       'TEST', 
--       'Test Connection', 
--       'test_' || gen_random_uuid()::text, 
--       'ACTIVE'
--     )
--     RETURNING id, name;
--     RAISE NOTICE 'INSERT successful!';
--   ELSE
--     RAISE EXCEPTION 'No workspace found for current user: %', auth.uid();
--   END IF;
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE NOTICE 'INSERT failed with error: %', SQLERRM;
-- END $$;
