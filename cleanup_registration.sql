-- Step 1: Drop the problematic function
DROP FUNCTION IF EXISTS create_user_with_subscription(TEXT, TEXT, TEXT, TEXT);

-- Step 2: Clean up the orphaned user in auth.users
-- This user was created by our function but doesn't have a profile
DELETE FROM auth.users 
WHERE email = 'xellifi.com@gmail.com' 
AND id NOT IN (SELECT id FROM profiles);

-- Step 3: Verify cleanup
SELECT email, created_at FROM auth.users WHERE email = 'xellifi.com@gmail.com';
-- Should return no rows after cleanup
