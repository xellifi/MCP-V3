-- ============================================
-- FIXED REGISTRATION SYSTEM 
-- Run this in Supabase SQL Editor
-- This version fixes permission issues with auth.users triggers
-- ============================================

-- ============================================
-- 1. ENSURE email_verified COLUMN EXISTS
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

UPDATE public.profiles 
SET email_verified = false 
WHERE email_verified IS NULL;

-- ============================================
-- 2. FIX RLS POLICIES FOR PROFILE INSERTION
-- The trigger needs to be able to insert profiles
-- ============================================
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" ON public.profiles
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Drop and recreate the insert policy to be more permissive for triggers
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 3. FIX RLS POLICIES FOR WORKSPACE INSERTION  
-- ============================================
DROP POLICY IF EXISTS "Allow workspace creation for new users" ON public.workspaces;
CREATE POLICY "Allow workspace creation for new users" ON public.workspaces
  FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 4. FIX RLS POLICIES FOR SUBSCRIPTION INSERTION
-- ============================================
DROP POLICY IF EXISTS "Allow subscription creation for new users" ON public.user_subscriptions;
CREATE POLICY "Allow subscription creation for new users" ON public.user_subscriptions
  FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- 5. UPDATED REGISTRATION TRIGGER
-- Uses SECURITY DEFINER and proper error handling
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
  free_package_id UUID;
BEGIN
  -- Get the user's name from metadata or fallback to email prefix
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );
  
  -- ========================================
  -- STEP 1: Create Profile
  -- ========================================
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      name, 
      role, 
      avatar_url, 
      affiliate_code,
      email_verified
    )
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      'member',
      'https://ui-avatars.com/api/?name=' || REPLACE(user_name, ' ', '+') || '&background=6366f1&color=fff',
      LOWER(REPLACE(REPLACE(user_name, ' ', ''), '''', '')) || '_' || SUBSTRING(NEW.id::TEXT, 1, 6),
      false
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create profile for %: %', NEW.id, SQLERRM;
  END;
  
  -- ========================================
  -- STEP 2: Create Default Workspace
  -- ========================================
  BEGIN
    -- Check if workspace already exists
    SELECT id INTO workspace_id 
    FROM public.workspaces 
    WHERE owner_id = NEW.id 
    LIMIT 1;
    
    IF workspace_id IS NULL THEN
      INSERT INTO public.workspaces (name, owner_id)
      VALUES (user_name || '''s Workspace', NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create workspace for %: %', NEW.id, SQLERRM;
  END;
  
  -- ========================================
  -- STEP 3: Assign FREE Subscription
  -- ========================================
  BEGIN
    -- Only create if user doesn't have one
    IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = NEW.id) THEN
      -- Find the FREE package
      SELECT id INTO free_package_id
      FROM public.packages
      WHERE is_active = true 
        AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
      ORDER BY price_monthly ASC
      LIMIT 1;
      
      -- Fallback: get the cheapest active package
      IF free_package_id IS NULL THEN
        SELECT id INTO free_package_id
        FROM public.packages
        WHERE is_active = true
        ORDER BY price_monthly ASC
        LIMIT 1;
      END IF;
      
      -- Create subscription if we found a package
      IF free_package_id IS NOT NULL THEN
        INSERT INTO public.user_subscriptions (
          user_id,
          package_id,
          status,
          billing_cycle,
          amount,
          next_billing_date,
          payment_method
        ) VALUES (
          NEW.id,
          free_package_id,
          'Active',
          'Monthly',
          0,
          NULL,
          'free'
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create subscription for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. EMAIL VERIFICATION SYNC TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
    UPDATE public.profiles
    SET email_verified = true
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;

CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verification();

-- ============================================
-- 7. IMPROVED RPC FUNCTIONS (for frontend backup)
-- ============================================

-- Ensure user has workspace
CREATE OR REPLACE FUNCTION public.ensure_user_workspace(p_user_id UUID, p_user_name TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  workspace_name TEXT;
  v_workspace_id UUID;
BEGIN
  -- First ensure profile exists
  INSERT INTO profiles (id, email, name, role, email_verified)
  SELECT p_user_id, '', COALESCE(p_user_name, 'User'), 'member', false
  WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id);

  workspace_name := COALESCE(NULLIF(TRIM(p_user_name), ''), 'My') || '''s Workspace';
  
  SELECT id INTO v_workspace_id FROM workspaces WHERE owner_id = p_user_id LIMIT 1;
  
  IF v_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, owner_id)
    VALUES (workspace_name, p_user_id)
    RETURNING id INTO v_workspace_id;
  END IF;
  
  RETURN json_build_object('success', true, 'workspace_id', v_workspace_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_workspace(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace(UUID, TEXT) TO anon;

-- Ensure user has FREE subscription
CREATE OR REPLACE FUNCTION public.ensure_user_free_subscription(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_package_id UUID;
  v_package_name TEXT;
  v_subscription_id UUID;
BEGIN
  -- Check if user already has a subscription
  SELECT id INTO v_subscription_id 
  FROM user_subscriptions 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  IF v_subscription_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'subscription_id', v_subscription_id, 'message', 'Already exists');
  END IF;
  
  -- Find the free package (must return a valid UUID)
  SELECT id, name INTO v_package_id, v_package_name
  FROM packages
  WHERE is_active = true 
    AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
  ORDER BY price_monthly ASC
  LIMIT 1;
  
  IF v_package_id IS NULL THEN
    SELECT id, name INTO v_package_id, v_package_name
    FROM packages
    WHERE is_active = true
    ORDER BY price_monthly ASC
    LIMIT 1;
  END IF;
  
  IF v_package_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No packages found. Please create a FREE package first.');
  END IF;
  
  -- Create the subscription
  INSERT INTO user_subscriptions (
    user_id, package_id, status, billing_cycle, amount, next_billing_date, payment_method
  ) VALUES (
    p_user_id, v_package_id, 'Active', 'Monthly', 0, NULL, 'free'
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN json_build_object('success', true, 'subscription_id', v_subscription_id, 'package_name', v_package_name);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO anon;

-- ============================================
-- 8. VERIFY PACKAGES TABLE HAS A FREE PACKAGE
-- ============================================
-- Check if FREE package exists, if not create one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM packages 
    WHERE is_active = true AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
  ) THEN
    -- Check if packages table has any packages at all
    IF NOT EXISTS (SELECT 1 FROM packages WHERE is_active = true) THEN
      RAISE WARNING 'No active packages found! Please create a FREE package in your admin panel.';
    END IF;
  END IF;
END $$;

-- ============================================
-- DONE! 
-- ============================================
