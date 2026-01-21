-- Migration: Add Facebook Login columns to profiles table
-- This enables storing Facebook user IDs and access tokens for Facebook Login for Business

-- Add facebook_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'facebook_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN facebook_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_profiles_facebook_id ON profiles(facebook_id);
    END IF;
END $$;

-- Add facebook_access_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'facebook_access_token'
    ) THEN
        ALTER TABLE profiles ADD COLUMN facebook_access_token TEXT;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.facebook_id IS 'Facebook user ID for Facebook Login for Business';
COMMENT ON COLUMN profiles.facebook_access_token IS 'Facebook access token for API calls';
