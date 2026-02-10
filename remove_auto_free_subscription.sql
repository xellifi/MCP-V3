-- ============================================
-- REMOVE AUTO-FREE SUBSCRIPTION FOR NEW USERS
-- New users will have NO plan and must choose one
-- Run in Supabase SQL Editor
-- ============================================

-- STEP 1: Update the handle_new_user trigger to NOT create a subscription
-- Now new users will only get a profile and workspace, but NO subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_name TEXT;
  workspace_id UUID;
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
  
  -- NOTE: We NO LONGER auto-create a FREE subscription
  -- Users must choose a plan from the packages page
  RAISE LOG 'New user created without subscription, must choose a plan: %', NEW.id;
  
  RETURN NEW;
END;
$$;

-- STEP 2: Update the RPC function to return message about no subscription
-- This prevents the frontend from creating subscriptions automatically
CREATE OR REPLACE FUNCTION public.ensure_user_free_subscription(p_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user already has a subscription
  IF EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = p_user_id) THEN
    RETURN json_build_object('success', true, 'message', 'Already has subscription');
  END IF;
  
  -- DO NOT auto-create subscription - user must choose a plan
  RETURN json_build_object('success', true, 'message', 'No subscription - user must choose a plan');
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_free_subscription(UUID) TO anon;

-- STEP 3: (OPTIONAL) Delete existing FREE subscriptions if you want to reset
-- WARNING: This will remove all free subscriptions!
-- Uncomment only if you want to force all users to choose a new plan
/*
DELETE FROM user_subscriptions 
WHERE package_id = 'free' 
   OR package_id IN (SELECT id FROM packages WHERE LOWER(name) LIKE '%free%');
*/

-- STEP 4: Verify the changes
SELECT 
    p.name, 
    p.email, 
    us.package_id,
    pkg.name as package_name
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
LEFT JOIN packages pkg ON pkg.id = us.package_id
ORDER BY p.created_at DESC
LIMIT 10;
