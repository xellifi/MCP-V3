-- Migration: Backfill page_id for existing subscribers
-- Run this in your Supabase SQL Editor to fix the filtering issue

-- This migration updates subscribers that have NULL page_id by matching them
-- to their workspace's connected pages. If a workspace has only one page,
-- all its subscribers will be linked to that page.

-- Step 1: For workspaces with exactly one connected page, 
-- assign all their subscribers to that page
UPDATE subscribers s
SET page_id = (
  SELECT cp.id 
  FROM connected_pages cp 
  WHERE cp.workspace_id = s.workspace_id 
  LIMIT 1
)
WHERE s.page_id IS NULL
  AND (
    SELECT COUNT(*) FROM connected_pages cp WHERE cp.workspace_id = s.workspace_id
  ) = 1;

-- Step 2: For workspaces with multiple pages, try to match via conversations
-- (Subscribers might have conversations linked to specific pages)
UPDATE subscribers s
SET page_id = (
  SELECT DISTINCT cp.id
  FROM conversations c
  JOIN connected_pages cp ON cp.page_id = c.page_id
  WHERE c.subscriber_id = s.id
    AND cp.workspace_id = s.workspace_id
  LIMIT 1
)
WHERE s.page_id IS NULL
  AND EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.subscriber_id = s.id AND c.page_id IS NOT NULL
  );

-- Step 3: Show remaining subscribers without page_id (for manual review)
-- SELECT id, name, workspace_id, created_at 
-- FROM subscribers 
-- WHERE page_id IS NULL 
-- ORDER BY created_at DESC;

-- Verify the fix
SELECT 
  cp.name as page_name,
  COUNT(s.id) as subscriber_count
FROM connected_pages cp
LEFT JOIN subscribers s ON s.page_id = cp.id
GROUP BY cp.id, cp.name
ORDER BY subscriber_count DESC;
