-- ============================================
-- FIX INFINITE RECURSION IN PROFILES RLS
-- Run this in your Supabase SQL Editor immediately
-- ============================================

-- The issue: The "Admins can manage all profiles" policy creates infinite 
-- recursion because it queries the profiles table while trying to access it.

-- Solution: Remove the recursive admin policy from profiles table
-- Admins should use the service_role key for admin operations anyway

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Step 2: Verify profiles table has correct simple policies
-- These should already exist but we'll recreate them to be safe
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;

-- Recreate safe policies (no recursion)
CREATE POLICY "Users can view own profile" ON public.profiles 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation" ON public.profiles 
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view all profiles (needed for user lists, etc.)
CREATE POLICY "Authenticated can view all profiles" ON public.profiles 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role has full access (used by backend)
CREATE POLICY "Service role full access profiles" ON public.profiles 
    FOR ALL TO service_role USING (true);

-- ============================================
-- ALSO FIX OTHER TABLES WITH SIMILAR ISSUE
-- These tables were referencing profiles to check admin status
-- ============================================

-- Fix admin_settings - use auth.jwt() instead of querying profiles
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
CREATE POLICY "Admins can manage settings" ON public.admin_settings 
    FOR ALL USING (
        (auth.jwt() ->> 'role')::text IN ('admin', 'ADMIN', 'owner', 'OWNER')
        OR auth.uid() IN (
            SELECT p.id FROM public.profiles p 
            WHERE p.role IN ('admin', 'ADMIN', 'owner', 'OWNER')
        )
    );

-- Alternative simpler approach - just allow service_role to manage
-- Admin operations should use service role key anyway
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;

-- Fix user_subscriptions
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;

-- Fix support_tickets
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;

-- Fix ticket_messages
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.ticket_messages;

-- ============================================
-- DONE! Try logging in again
-- ============================================
-- Note: Admin operations should use the SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS entirely. This is the correct approach for
-- admin functionality in production.
