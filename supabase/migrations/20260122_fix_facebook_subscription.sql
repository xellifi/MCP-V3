-- ============================================
-- COMPLETE FIX: Facebook Login Users Missing FREE Subscription
-- Run this in Supabase SQL Editor
-- Date: 2026-01-22
-- ============================================

-- ============================================
-- STEP 1: Update the handle_new_user trigger
-- FIXED: Specifically find FREE package, exclude LIFETIME
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
  
  -- Assign FREE Subscription (FIXED: specifically find FREE, not LIFETIME)
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = NEW.id) THEN
      -- Find FREE package specifically (exclude lifetime)
      SELECT id INTO free_pkg_id
      FROM public.packages
      WHERE is_active = true 
        AND LOWER(name) LIKE '%free%'
        AND LOWER(name) NOT LIKE '%lifetime%'
      LIMIT 1;
      
      IF free_pkg_id IS NULL THEN
        free_pkg_id := 'free';
      END IF;
      
      INSERT INTO public.user_subscriptions (
        user_id, package_id, status, billing_cycle, amount, payment_method
      ) VALUES (NEW.id, free_pkg_id, 'Active', 'Monthly', 0, 'free');
      
      RAISE LOG 'Created FREE subscription for user % with package %', NEW.id, free_pkg_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create subscription for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 2: Update the RPC function (backup for frontend)
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
  SELECT id INTO v_subscription_id FROM user_subscriptions WHERE user_id = p_user_id LIMIT 1;
  
  IF v_subscription_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'message', 'Already has subscription');
  END IF;
  
  -- Find FREE package specifically (exclude lifetime)
  SELECT id INTO v_package_id
  FROM packages
  WHERE is_active = true 
    AND LOWER(name) LIKE '%free%'
    AND LOWER(name) NOT LIKE '%lifetime%'
  LIMIT 1;
  
  IF v_package_id IS NULL THEN
    v_package_id := 'free';
  END IF;
  
  INSERT INTO user_subscriptions (user_id, package_id, status, billing_cycle, amount, payment_method)
  VALUES (p_user_id, v_package_id, 'Active', 'Monthly', 0, 'free')
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
-- STEP 3: Fix existing users without subscriptions
-- ============================================
INSERT INTO user_subscriptions (user_id, package_id, status, billing_cycle, amount, payment_method)
SELECT 
    p.id,
    COALESCE(
        (SELECT id FROM packages 
         WHERE is_active = true 
         AND LOWER(name) LIKE '%free%'
         AND LOWER(name) NOT LIKE '%lifetime%'
         LIMIT 1),
        'free'
    ),
    'Active', 'Monthly', 0, 'free'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id);

-- ============================================
-- STEP 4: Verify
-- ============================================
SELECT p.name, p.email, us.package_id, pkg.name as package_name
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
LEFT JOIN packages pkg ON pkg.id = us.package_id
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 5: Fix auth_provider for Facebook users
-- Users with facebook_id should have auth_provider = 'facebook'
-- ============================================
UPDATE profiles
SET auth_provider = 'facebook'
WHERE facebook_id IS NOT NULL
  AND (auth_provider IS NULL OR auth_provider = 'email');

-- ============================================
-- STEP 6: Fix auth_provider for Google users
-- Check auth.users table for google provider
-- ============================================
UPDATE public.profiles p
SET auth_provider = 'google'
FROM auth.users u
WHERE p.id = u.id
  AND u.raw_app_meta_data->>'provider' = 'google'
  AND (p.auth_provider IS NULL OR p.auth_provider = 'email');

-- Verify auth_provider updates
SELECT name, email, auth_provider
FROM profiles
ORDER BY created_at DESC
LIMIT 15;
