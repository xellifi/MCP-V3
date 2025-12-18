-- Remove duplicate pages from connected_pages table
-- Run this in Supabase SQL Editor

-- Step 1: Find duplicates
SELECT page_id, workspace_id, COUNT(*) as count
FROM public.connected_pages
GROUP BY page_id, workspace_id
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicates, keeping only the most recent one
DELETE FROM public.connected_pages
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY page_id, workspace_id 
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) as rn
    FROM public.connected_pages
  ) t
  WHERE t.rn > 1
);

-- Step 3: Verify no duplicates remain
SELECT page_id, workspace_id, COUNT(*) as count
FROM public.connected_pages
GROUP BY page_id, workspace_id
HAVING COUNT(*) > 1;

-- Step 4: Add unique constraint to prevent future duplicates
ALTER TABLE public.connected_pages
ADD CONSTRAINT connected_pages_unique_page_workspace 
UNIQUE (page_id, workspace_id);
