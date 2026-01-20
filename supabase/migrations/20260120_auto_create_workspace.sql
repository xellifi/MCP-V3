-- Auto-create workspace when a new profile is created
-- This runs with database privileges, bypassing RLS

-- Create the function that creates a workspace for new profiles (trigger version)
CREATE OR REPLACE FUNCTION create_workspace_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
AS $$
DECLARE
  workspace_name TEXT;
BEGIN
  -- Build workspace name safely
  workspace_name := COALESCE(NULLIF(TRIM(NEW.name), ''), 'My') || '''s Workspace';
  
  -- Check if user already has a workspace (prevent duplicates)
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = NEW.id) THEN
    INSERT INTO workspaces (name, owner_id)
    VALUES (workspace_name, NEW.id);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Failed to create workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_profile_created_create_workspace ON profiles;

-- Create the trigger on the profiles table
CREATE TRIGGER on_profile_created_create_workspace
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_workspace_for_new_profile();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_workspace_for_new_profile() TO service_role;

-- ============================================================
-- RPC FUNCTION: For frontend to call when workspace is needed
-- This is a backup method that can be called by the frontend
-- ============================================================

CREATE OR REPLACE FUNCTION ensure_user_workspace(p_user_id UUID, p_user_name TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
AS $$
DECLARE
  workspace_name TEXT;
  v_workspace_id UUID;
BEGIN
  -- Build workspace name safely
  workspace_name := COALESCE(NULLIF(TRIM(p_user_name), ''), 'My') || '''s Workspace';
  
  -- Check if user already has a workspace
  SELECT id INTO v_workspace_id FROM workspaces WHERE owner_id = p_user_id LIMIT 1;
  
  IF v_workspace_id IS NULL THEN
    -- Create new workspace
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_workspace(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_workspace(UUID, TEXT) TO anon;

-- ============================================================
-- RPC FUNCTION: Ensure user has a free subscription
-- Called during registration to assign free plan
-- ============================================================

CREATE OR REPLACE FUNCTION ensure_user_free_subscription(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS
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
  
  -- Find the free package (price_monthly = 0 or name contains 'free')
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

-- Grant execute to authenticated users and anon (for registration)
GRANT EXECUTE ON FUNCTION ensure_user_free_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_free_subscription(UUID) TO anon;
