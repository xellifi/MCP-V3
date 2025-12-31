-- Add new columns to subscribers table for bot subscriber tracking
-- Run this in your Supabase SQL Editor

-- Add page_id column to track which page the subscriber came from
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES connected_pages(id) ON DELETE SET NULL;

-- Add labels column for bot labels (array of strings)
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- Add source column to track how they became a subscriber
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('COMMENT', 'MESSAGE', 'POSTBACK'));

-- Add email column to store subscriber email (from Facebook permission)
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on page_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_subscribers_page_id ON subscribers(page_id);

-- Create index on workspace_id + page_id for common query pattern
CREATE INDEX IF NOT EXISTS idx_subscribers_workspace_page ON subscribers(workspace_id, page_id);

-- Update RLS policies to allow updates to labels
-- (Only needed if you have RLS enabled on subscribers table)

-- Allow authenticated users to update their own workspace's subscribers
DROP POLICY IF EXISTS "Users can update subscribers in their workspace" ON subscribers;
CREATE POLICY "Users can update subscribers in their workspace"
ON subscribers FOR UPDATE
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- Allow authenticated users to delete their own workspace's subscribers
DROP POLICY IF EXISTS "Users can delete subscribers in their workspace" ON subscribers;
CREATE POLICY "Users can delete subscribers in their workspace"
ON subscribers FOR DELETE
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- Allow service role to insert/update/delete subscribers (for webhook)
-- Note: Service role bypasses RLS, so this is mainly for documentation
