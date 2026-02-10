-- ============================================
-- COMPREHENSIVE FIX: FREE Plan Allowed Routes Accuracy
-- This script fixes ALL issues with new users not getting
-- accurate features based on their FREE plan configuration
-- 
-- Run ALL steps in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Fix RLS on packages table
-- Ensure ALL authenticated users can READ packages
-- This is critical for the subscription JOIN query
-- ============================================
DO $$
BEGIN
  -- Drop any restrictive SELECT policies
  DROP POLICY IF EXISTS "Public can view active packages" ON public.packages;
  DROP POLICY IF EXISTS "Anyone can view packages" ON public.packages;
  DROP POLICY IF EXISTS "packages_select_policy" ON public.packages;
  DROP POLICY IF EXISTS "Everyone can read packages" ON public.packages;
  DROP POLICY IF EXISTS "Public can see active packages" ON public.packages;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Some policies did not exist, continuing...';
END $$;

-- Create permissive SELECT policy for authenticated users
CREATE POLICY "Everyone can read packages" 
ON public.packages 
FOR SELECT 
TO authenticated
USING (true);

-- Allow anon (public visitors) to see active packages (pricing page)
CREATE POLICY "Public can see active packages" 
ON public.packages 
FOR SELECT 
TO anon
USING (is_active = true);

-- ============================================
-- STEP 2: Verify packages table has allowed_routes column
-- ============================================
DO $$
BEGIN
  -- Check if allowed_routes column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packages' AND column_name = 'allowed_routes'
  ) THEN
    ALTER TABLE public.packages ADD COLUMN allowed_routes JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added allowed_routes column to packages table';
  ELSE
    RAISE NOTICE 'allowed_routes column already exists';
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix the handle_new_user trigger
-- CRITICAL: Must find the correct FREE package UUID
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name TEXT;
  workspace_id UUID;
  free_pkg_id TEXT;
  auth_prov TEXT;
BEGIN
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );
  
  -- Detect auth provider from Supabase metadata
  auth_prov := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  
  -- Create Profile with auth_provider
  BEGIN
    INSERT INTO public.profiles (
      id, email, name, role, avatar_url, affiliate_code, email_verified, auth_provider
    ) VALUES (
      NEW.id, NEW.email, user_name, 'member',
      COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        'https://ui-avatars.com/api/?name=' || REPLACE(user_name, ' ', '+') || '&background=6366f1&color=fff'
      ),
      LOWER(REPLACE(REPLACE(user_name, ' ', ''), '''', '')) || '_' || SUBSTRING(NEW.id::TEXT, 1, 6),
      CASE WHEN auth_prov != 'email' THEN true ELSE false END,
      auth_prov
    ) ON CONFLICT (id) DO UPDATE SET
      auth_provider = COALESCE(EXCLUDED.auth_provider, public.profiles.auth_provider),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create profile for %: %', NEW.id, SQLERRM;
  END;
  
  -- Create Workspace
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE owner_id = NEW.id) THEN
      INSERT INTO public.workspaces (name, owner_id)
      VALUES (user_name || '''s Workspace', NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create workspace for %: %', NEW.id, SQLERRM;
  END;
  
  -- Assign FREE Subscription with correct package UUID
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = NEW.id) THEN
      -- Find FREE package by name (case insensitive, exclude lifetime)
      SELECT id INTO free_pkg_id
      FROM public.packages
      WHERE is_active = true 
        AND LOWER(name) LIKE '%free%'
        AND LOWER(name) NOT LIKE '%lifetime%'
      ORDER BY created_at ASC
      LIMIT 1;
      
      -- If no FREE package found, try to find the cheapest package (price = 0)
      IF free_pkg_id IS NULL THEN
        SELECT id INTO free_pkg_id
        FROM public.packages
        WHERE is_active = true 
          AND (price_monthly = 0 OR price_monthly IS NULL)
        ORDER BY created_at ASC
        LIMIT 1;
      END IF;
      
      -- Only create subscription if we found a valid package
      IF free_pkg_id IS NOT NULL THEN
        INSERT INTO public.user_subscriptions (
          user_id, package_id, status, billing_cycle, amount, payment_method
        ) VALUES (NEW.id, free_pkg_id, 'Active', 'Lifetime', 0, 'free');
        
        RAISE LOG 'Created FREE subscription for user % with package %', NEW.id, free_pkg_id;
      ELSE
        RAISE LOG 'WARNING: No FREE package found for user %', NEW.id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create subscription for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Fix the ensure_user_free_subscription RPC
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_user_free_subscription(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_package_id TEXT;
  v_subscription_id UUID;
BEGIN
  -- Check if user already has a subscription
  SELECT id INTO v_subscription_id FROM user_subscriptions WHERE user_id = p_user_id LIMIT 1;
  
  IF v_subscription_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'message', 'Already has subscription');
  END IF;
  
  -- Find FREE package by name
  SELECT id INTO v_package_id
  FROM packages
  WHERE is_active = true 
    AND LOWER(name) LIKE '%free%'
    AND LOWER(name) NOT LIKE '%lifetime%'
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Fallback: find cheapest package
  IF v_package_id IS NULL THEN
    SELECT id INTO v_package_id
    FROM packages
    WHERE is_active = true 
      AND (price_monthly = 0 OR price_monthly IS NULL)
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;
  
  IF v_package_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No FREE package found');
  END IF;
  
  INSERT INTO user_subscriptions (user_id, package_id, status, billing_cycle, amount, payment_method)
  VALUES (p_user_id, v_package_id, 'Active', 'Lifetime', 0, 'free')
  RETURNING id INTO v_subscription_id;
  
  RETURN json_build_object('success', true, 'subscription_id', v_subscription_id, 'package_id', v_package_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO anon;

-- ============================================
-- STEP 5: Fix existing subscriptions with broken package_id
-- This updates any subscription where package_id doesn't match
-- a real package record
-- ============================================
UPDATE user_subscriptions us
SET package_id = (
    SELECT id FROM packages 
    WHERE is_active = true 
      AND LOWER(name) LIKE '%free%'
      AND LOWER(name) NOT LIKE '%lifetime%'
    ORDER BY created_at ASC
    LIMIT 1
)
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE id = us.package_id)
  AND (
    SELECT id FROM packages 
    WHERE is_active = true 
      AND LOWER(name) LIKE '%free%'
      AND LOWER(name) NOT LIKE '%lifetime%'
    LIMIT 1
  ) IS NOT NULL;

-- ============================================
-- STEP 6: Verify everything
-- ============================================

-- Show all packages with their allowed_routes
SELECT id, name, is_active, allowed_routes, price_monthly
FROM packages
ORDER BY name;

-- Show all subscriptions with their linked package data
SELECT 
    us.id as sub_id,
    us.user_id,
    us.package_id,
    us.status,
    us.billing_cycle,
    p.name as profile_name,
    pkg.name as package_name,
    pkg.allowed_routes
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
LEFT JOIN packages pkg ON pkg.id = us.package_id
ORDER BY us.created_at DESC
LIMIT 15;

-- Check for any subscriptions still missing package link
SELECT COUNT(*) as broken_subscriptions
FROM user_subscriptions us
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE id = us.package_id);
