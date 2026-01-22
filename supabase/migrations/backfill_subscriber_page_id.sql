-- Backfill subscriber page_id with correct UUIDs
-- This script populates the page_id column for existing subscribers
-- by matching them to their conversations and connected pages

-- First, let's check how many subscribers have NULL page_id
SELECT COUNT(*) as total_subscribers,
       COUNT(page_id) as with_page_id,
       COUNT(*) - COUNT(page_id) as null_page_id
FROM subscribers;

-- Strategy: Match subscribers to conversations, then get the connected_page.id

-- Update subscribers by finding their conversations and getting the page UUID
UPDATE subscribers s
SET page_id = (
    SELECT cp.id
    FROM conversations c
    JOIN connected_pages cp ON c.page_id = cp.page_id
    WHERE (c.subscriber_id = s.id OR c.subscriber_id = s.external_id)
      AND c.workspace_id = s.workspace_id
    ORDER BY c.updated_at DESC
    LIMIT 1
)
WHERE s.page_id IS NULL
  AND EXISTS (
    SELECT 1 FROM conversations c
    JOIN connected_pages cp ON c.page_id = cp.page_id
    WHERE (c.subscriber_id = s.id OR c.subscriber_id = s.external_id)
      AND c.workspace_id = s.workspace_id
);

-- For subscribers without conversations, try to find their page from the workspace's single page
-- (Many workspaces have only one page connected)
UPDATE subscribers s
SET page_id = (
    SELECT cp.id
    FROM connected_pages cp
    WHERE cp.workspace_id = s.workspace_id
    LIMIT 1
)
WHERE s.page_id IS NULL
  AND (SELECT COUNT(*) FROM connected_pages WHERE workspace_id = s.workspace_id) = 1;

-- Final check - show remaining NULL page_ids
SELECT COUNT(*) as remaining_null_page_ids
FROM subscribers
WHERE page_id IS NULL;

-- Show updated results
SELECT COUNT(*) as total_subscribers,
       COUNT(page_id) as with_page_id,
       COUNT(*) - COUNT(page_id) as null_page_id
FROM subscribers;
