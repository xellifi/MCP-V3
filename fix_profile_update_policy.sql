-- ============================================
-- FIX: Profile Update RLS Policy
-- Run this in Supabase SQL Editor
-- Fixes the issue where saving profile (avatar URL, name, etc.) hangs
-- ============================================

-- ============================================
-- STEP 1: Drop and recreate profiles UPDATE policy
-- The old policy may be missing WITH CHECK clause
-- ============================================
DO $$
BEGIN
  -- Drop all existing UPDATE policies on profiles
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some policies did not exist, continuing...';
END $$;

-- Create proper UPDATE policy with both USING and WITH CHECK
-- USING = which rows the user can see for update
-- WITH CHECK = validates the new values after update
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- STEP 2: Ensure SELECT policies exist
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some policies did not exist, continuing...';
END $$;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Authenticated users can view all profiles (needed for admin, chat, etc.)
CREATE POLICY "Authenticated can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- ============================================
-- STEP 3: Ensure INSERT policy exists
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy did not exist, continuing...';
END $$;

CREATE POLICY "Allow profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- ============================================
-- STEP 4: Ensure service_role has full access
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy did not exist, continuing...';
END $$;

CREATE POLICY "Service role full access profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true);

-- ============================================
-- STEP 5: Ensure RLS is enabled (safety check)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Fix storage policies for profile-logo bucket
-- Ensures users can upload/update/delete their own avatars
-- ============================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-logo', 'profile-logo', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Profile logos are publicly accessible." ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own profile logo." ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own profile logo." ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own profile logo." ON storage.objects;
  DROP POLICY IF EXISTS "Profile logos are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own profile logo" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own profile logo" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own profile logo" ON storage.objects;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some storage policies did not exist, continuing...';
END $$;

-- Anyone can view profile logos (public bucket)
CREATE POLICY "Profile logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-logo');

-- Authenticated users can upload to their own folder (folder = user id)
CREATE POLICY "Users can upload their own profile logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-logo' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update their own files
CREATE POLICY "Users can update their own profile logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-logo' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete their own files
CREATE POLICY "Users can delete their own profile logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-logo' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- STEP 7: Verify policies
-- ============================================

-- Show all profiles policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Show storage policies for profile-logo
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND (qual LIKE '%profile-logo%' OR with_check LIKE '%profile-logo%')
ORDER BY policyname;

-- Quick test: Check if current user can see their own profile
SELECT id, name, email, avatar_url 
FROM profiles 
WHERE id = auth.uid();
