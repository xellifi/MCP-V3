-- Add missing access_token column to meta_connections table
-- This column is needed to store Facebook OAuth access tokens
-- Run this in Supabase SQL Editor

-- Add the access_token column if it doesn't exist
ALTER TABLE public.meta_connections 
ADD COLUMN IF NOT EXISTS access_token TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'meta_connections'
ORDER BY ordinal_position;
