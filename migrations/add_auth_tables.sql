-- ============================================
-- Auth Tables for Custom JWT Auth System
-- Run this on your PostgreSQL database
-- ============================================

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Email Verification Tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Add password_hash column to profiles (if not already exists)
-- Supabase stored passwords in auth.users; we now store them in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Make sure email_verified column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Drop all RLS policies (Supabase-specific, not needed with custom API auth)
-- Run these if you are migrating an existing Supabase DB:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE connected_pages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE flows DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscribers DISABLE ROW LEVEL SECURITY;
-- (repeat for all tables)
