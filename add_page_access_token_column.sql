-- Add missing page_access_token column to connected_pages table
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE public.connected_pages 
ADD COLUMN IF NOT EXISTS page_access_token TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'connected_pages'
ORDER BY ordinal_position;
