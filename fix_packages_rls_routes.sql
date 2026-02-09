-- ============================================
-- FIX: Packages RLS for Route Permissions
-- This ensures regular users can read packages data including allowed_routes
-- when fetching their subscription
-- ============================================

-- STEP 1: Check current policies on packages table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'packages';

-- STEP 2: Drop any conflicting or overly restrictive policies
DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
DROP POLICY IF EXISTS "Anyone can view packages" ON public.packages;
DROP POLICY IF EXISTS "packages_select_policy" ON public.packages;

-- STEP 3: Create simple, permissive SELECT policy
-- This allows ALL authenticated users to read packages
-- This is needed for the subscription query to join packages properly
CREATE POLICY "Everyone can read packages" 
ON public.packages 
FOR SELECT 
TO authenticated
USING (true);

-- Also allow anon (public visitors) to see active packages (pricing page)
CREATE POLICY "Public can see active packages" 
ON public.packages 
FOR SELECT 
TO anon
USING (is_active = true);

-- STEP 4: Verify the new policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename = 'packages';

-- STEP 5: Test - Verify that a subscription query can access package data
-- Run this as the test user's context
SELECT 
    us.id as subscription_id,
    us.status,
    us.package_id,
    pkg.name as package_name,
    pkg.allowed_routes
FROM user_subscriptions us
LEFT JOIN packages pkg ON pkg.id = us.package_id
LIMIT 5;
