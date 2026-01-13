-- DROP the problematic function that breaks registration
DROP FUNCTION IF EXISTS create_user_with_subscription(TEXT, TEXT, TEXT, TEXT);

-- This function should NOT create auth users directly
-- Instead, admins should use the Supabase Admin API from the server-side
-- For now, we'll remove this function to restore normal registration
