-- Simplified user creation function that works with Supabase Auth
-- This function creates a user subscription after the user is created via normal signup

CREATE OR REPLACE FUNCTION create_user_with_subscription(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_package_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_package RECORD;
  v_result JSON;
BEGIN
  -- First, check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  -- If user doesn't exist, we need to use Supabase's signup endpoint
  -- This function will only work for existing users or we need a different approach
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be created through Supabase Auth signup first. Email: %', p_email;
  END IF;

  -- Update profile with name
  UPDATE profiles
  SET name = p_name
  WHERE id = v_user_id;

  -- Get package details
  SELECT * INTO v_package FROM packages WHERE id = p_package_id;

  IF v_package IS NULL THEN
    RAISE EXCEPTION 'Package not found: %', p_package_id;
  END IF;

  -- Create or update subscription
  INSERT INTO user_subscriptions (
    user_id,
    package_id,
    status,
    billing_cycle,
    amount,
    next_billing_date,
    payment_method,
    created_at
  ) VALUES (
    v_user_id,
    p_package_id,
    'Active',
    'monthly',
    v_package.price_monthly,
    NOW() + INTERVAL '30 days',
    'manual',
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    package_id = p_package_id,
    amount = v_package.price_monthly,
    updated_at = NOW();

  -- Return success
  v_result := json_build_object(
    'success', true,
    'user', json_build_object(
      'id', v_user_id,
      'email', p_email,
      'name', p_name
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating user subscription: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION create_user_with_subscription TO authenticated;
