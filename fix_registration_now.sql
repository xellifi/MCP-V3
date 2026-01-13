-- URGENT: Drop the function that's breaking registration
DROP FUNCTION IF EXISTS create_user_with_subscription(TEXT, TEXT, TEXT, TEXT);

-- Clean up any duplicate users if needed
-- (Run this only if you see duplicate user issues)
-- DELETE FROM auth.users WHERE email = 'xellifi.com@gmail.com' AND created_at > NOW() - INTERVAL '1 hour';
