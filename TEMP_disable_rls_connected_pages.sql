-- TEMPORARY FIX: Disable RLS to allow page saves
-- Run this in Supabase SQL Editor

-- Disable RLS on connected_pages table
ALTER TABLE public.connected_pages DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'connected_pages';

-- After this:
-- 1. Reconnect your Facebook profile
-- 2. Pages should save successfully
-- 3. Then run the re-enable script below

-- TO RE-ENABLE RLS LATER (after pages are saved):
-- ALTER TABLE public.connected_pages ENABLE ROW LEVEL SECURITY;
