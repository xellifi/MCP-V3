-- Check and fix is_automation_enabled column
-- Run this in Supabase SQL Editor

-- Check current schema
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'connected_pages' 
  AND column_name = 'is_automation_enabled';

-- If the column doesn't exist or has wrong default, fix it:
ALTER TABLE public.connected_pages 
ALTER COLUMN is_automation_enabled SET DEFAULT false;

-- Update existing NULL values to false
UPDATE public.connected_pages 
SET is_automation_enabled = false 
WHERE is_automation_enabled IS NULL;

-- Verify
SELECT id, name, is_automation_enabled 
FROM public.connected_pages 
LIMIT 5;
