-- ============================================
-- COMPLETE REGISTRATION SYSTEM
-- Run this in Supabase SQL Editor
-- This creates all necessary triggers for user registration:
-- 1. Profile creation with email_verified flag
-- 2. Default workspace creation
-- 3. FREE subscription assignment
-- ============================================

-- ============================================
-- 1. ADD email_verified COLUMN TO PROFILES
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Update any NULL values to false
UPDATE public.profiles 
SET email_verified = false 
WHERE email_verified IS NULL;

-- ============================================
-- 2. COMPREHENSIVE REGISTRATION TRIGGER
-- This trigger fires when a new user signs up in auth.users
-- It creates: profile, workspace, and FREE subscription
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  workspace_id UUID;
  free_package_id UUID;
  free_package_name TEXT;
BEGIN
  -- Get the user's name from metadata or fallback to email prefix
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    split_part(NEW.email, '@', 1)
  );
  
  -- ========================================
  -- STEP 1: Create Profile
  -- ========================================
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
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)  -- Set based on confirmation status
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, profiles.email_verified);
  
  RAISE NOTICE 'Created profile for user %', NEW.id;
  
  -- ========================================
  -- STEP 2: Create Default Workspace
  -- ========================================
  -- Check if workspace already exists
  SELECT id INTO workspace_id 
  FROM public.workspaces 
  WHERE owner_id = NEW.id 
  LIMIT 1;
  
  IF workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (user_name || '''s Workspace', NEW.id)
    RETURNING id INTO workspace_id;
    
    RAISE NOTICE 'Created workspace % for user %', workspace_id, NEW.id;
  END IF;
  
  -- ========================================
  -- STEP 3: Assign FREE Subscription
  -- ========================================
  -- Check if user already has a subscription
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = NEW.id) THEN
    -- Find the FREE package (price_monthly = 0 or name contains 'free')
    SELECT id, name INTO free_package_id, free_package_name
    FROM public.packages
    WHERE is_active = true 
      AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
    ORDER BY price_monthly ASC
    LIMIT 1;
    
    -- Fallback: get the cheapest active package
    IF free_package_id IS NULL THEN
      SELECT id, name INTO free_package_id, free_package_name
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
        NULL,  -- No billing for free plan
        'free'
      );
      
      RAISE NOTICE 'Created FREE subscription (%) for user %', free_package_name, NEW.id;
    ELSE
      RAISE WARNING 'No active packages found for user % - subscription not created', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================
-- 3. RPC FUNCTIONS (Backup methods called from frontend)
-- These are fallback functions in case the trigger fails
-- ============================================

-- Ensure user has a workspace (backup RPC)
CREATE OR REPLACE FUNCTION ensure_user_workspace(p_user_id UUID, p_user_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_name TEXT;
  v_workspace_id UUID;
BEGIN
  workspace_name := COALESCE(NULLIF(TRIM(p_user_name), ''), 'My') || '''s Workspace';
  
  SELECT id INTO v_workspace_id FROM workspaces WHERE owner_id = p_user_id LIMIT 1;
  
  IF v_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, owner_id)
    VALUES (workspace_name, p_user_id)
    RETURNING id INTO v_workspace_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'workspace_id', v_workspace_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_user_workspace(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_workspace(UUID, TEXT) TO anon;

-- Ensure user has FREE subscription (backup RPC)
CREATE OR REPLACE FUNCTION ensure_user_free_subscription(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
    RETURN json_build_object(
      'success', true,
      'subscription_id', v_subscription_id,
      'message', 'User already has subscription'
    );
  END IF;
  
  -- Find the free package
  SELECT id, name INTO v_package_id, v_package_name
  FROM packages
  WHERE is_active = true 
    AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
  ORDER BY price_monthly ASC
  LIMIT 1;
  
  -- Fallback: get cheapest active package
  IF v_package_id IS NULL THEN
    SELECT id, name INTO v_package_id, v_package_name
    FROM packages
    WHERE is_active = true
    ORDER BY price_monthly ASC
    LIMIT 1;
  END IF;
  
  IF v_package_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active packages found'
    );
  END IF;
  
  -- Create the subscription
  INSERT INTO user_subscriptions (
    user_id,
    package_id,
    status,
    billing_cycle,
    amount,
    next_billing_date,
    payment_method
  ) VALUES (
    p_user_id,
    v_package_id,
    'Active',
    'Monthly',
    0,
    NULL,
    'free'
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN json_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'package_name', v_package_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_user_free_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_free_subscription(UUID) TO anon;

-- ============================================
-- 4. TRIGGER TO SYNC EMAIL VERIFICATION STATUS
-- Updates profiles.email_verified when auth.users is updated
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When email_confirmed_at changes from null to a value, update profile
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET email_verified = true
    WHERE id = NEW.id;
    
    RAISE NOTICE 'Email verified for user %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;

-- Create trigger for email verification sync
CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.sync_email_verification();

GRANT EXECUTE ON FUNCTION public.sync_email_verification() TO service_role;

-- ============================================
-- DONE! Registration system is now complete
-- ============================================
-- When a user signs up:
-- 1. ✅ Profile created with email_verified = false
-- 2. ✅ Workspace created automatically
-- 3. ✅ FREE subscription assigned automatically
-- 4. ✅ email_verified syncs when user confirms email
-- ============================================
