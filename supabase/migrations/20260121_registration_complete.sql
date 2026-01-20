-- ============================================
-- FIXED REGISTRATION SYSTEM 
-- CORRECTED: package_id is TEXT not UUID
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FIX: Create subscription for existing users who don't have one
-- ============================================
INSERT INTO user_subscriptions (user_id, package_id, status, billing_cycle, amount, payment_method)
SELECT p.id, 'free', 'Active', 'Monthly', 0, 'free'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id);

-- ============================================
-- 2. UPDATED REGISTRATION TRIGGER
-- Uses TEXT for package_id (not UUID)
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
  free_pkg_id TEXT;  -- Changed to TEXT
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
      id, email, name, role, avatar_url, affiliate_code, email_verified
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
    SELECT id INTO workspace_id FROM public.workspaces WHERE owner_id = NEW.id LIMIT 1;
    
    IF workspace_id IS NULL THEN
      INSERT INTO public.workspaces (name, owner_id)
      VALUES (user_name || '''s Workspace', NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create workspace for %: %', NEW.id, SQLERRM;
  END;
  
  -- ========================================
  -- STEP 3: Assign FREE Subscription
  -- package_id is TEXT type, not UUID!
  -- ========================================
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = NEW.id) THEN
      -- Find the FREE package ID (TEXT type)
      SELECT id INTO free_pkg_id
      FROM public.packages
      WHERE is_active = true 
        AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
      ORDER BY price_monthly ASC
      LIMIT 1;
      
      -- Default to 'free' if not found
      IF free_pkg_id IS NULL THEN
        free_pkg_id := 'free';
      END IF;
      
      -- Create subscription with TEXT package_id
      INSERT INTO public.user_subscriptions (
        user_id, package_id, status, billing_cycle, amount, payment_method
      ) VALUES (
        NEW.id,
        free_pkg_id,  -- TEXT, not UUID!
        'Active',
        'Monthly',
        0,
        'free'
      );
      
      RAISE LOG 'Created FREE subscription for user %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Failed to create subscription for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. FIX RPC FUNCTION for frontend backup
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_user_free_subscription(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_package_id TEXT;  -- Changed to TEXT
  v_subscription_id UUID;
BEGIN
  -- Check if user already has a subscription
  SELECT id INTO v_subscription_id FROM user_subscriptions WHERE user_id = p_user_id LIMIT 1;
  
  IF v_subscription_id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'message', 'Already has subscription');
  END IF;
  
  -- Find the free package (TEXT id)
  SELECT id INTO v_package_id
  FROM packages
  WHERE is_active = true AND (price_monthly = 0 OR LOWER(name) LIKE '%free%')
  ORDER BY price_monthly ASC
  LIMIT 1;
  
  IF v_package_id IS NULL THEN
    v_package_id := 'free';  -- Default fallback
  END IF;
  
  -- Create the subscription
  INSERT INTO user_subscriptions (
    user_id, package_id, status, billing_cycle, amount, payment_method
  ) VALUES (
    p_user_id, v_package_id, 'Active', 'Monthly', 0, 'free'
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN json_build_object('success', true, 'subscription_id', v_subscription_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO anon;

-- ============================================
-- 4. Verify: Show all users and their subscriptions
-- ============================================
SELECT 
  p.name,
  p.email,
  us.package_id,
  us.status
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
ORDER BY p.created_at DESC;
