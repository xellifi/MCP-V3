-- ============================================
-- ADD AUTH PROVIDER COLUMN FOR USER LOGIN METHOD TRACKING
-- Run this in Supabase SQL Editor
-- ============================================

-- Add auth_provider column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Update existing users based on their facebook_id
UPDATE profiles 
SET auth_provider = 'facebook' 
WHERE facebook_id IS NOT NULL AND facebook_id != '';

-- Note: For Google OAuth, you would update similarly:
-- UPDATE profiles SET auth_provider = 'google' WHERE google_id IS NOT NULL;
-- You may need to add google_id column if using Google OAuth

-- Add comment for documentation
COMMENT ON COLUMN profiles.auth_provider IS 'Login method: email, facebook, google';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);

-- Verify the changes
SELECT id, name, email, auth_provider, facebook_id 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
