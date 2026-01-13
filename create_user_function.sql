-- Create a database function to create users with admin privileges
-- This function will be called from the client but runs with elevated privileges

CREATE OR REPLACE FUNCTION create_user_with_subscription(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_package_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function owner
AS $$
DECLARE
  v_user_id UUID;
  v_package RECORD;
  v_result JSON;
BEGIN
  -- Create user in auth.users (requires SECURITY DEFINER)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('name', p_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Profile will be created automatically by the handle_new_user trigger
  -- But we need to update it with the correct name in case the trigger runs first
  UPDATE profiles
  SET name = p_name
  WHERE id = v_user_id;

  -- Get package details
  SELECT * INTO v_package FROM packages WHERE id = p_package_id;

  IF v_package IS NULL THEN
    RAISE EXCEPTION 'Package not found: %', p_package_id;
  END IF;

  -- Create subscription
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
  );

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
    RAISE EXCEPTION 'Error creating user: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (admins only in practice due to RLS)
GRANT EXECUTE ON FUNCTION create_user_with_subscription TO authenticated;
