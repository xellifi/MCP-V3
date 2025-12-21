-- Complete rebuild of comment automation database schema
-- This migration creates a robust system to prevent duplicate replies

-- Step 1: Create automation log table to track every action
CREATE TABLE IF NOT EXISTS comment_automation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id TEXT NOT NULL,
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('comment_reply', 'dm_sent')),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    facebook_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to prevent duplicate actions on same comment
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_log_unique 
ON comment_automation_log(comment_id, action_type);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_automation_log_comment 
ON comment_automation_log(comment_id);

CREATE INDEX IF NOT EXISTS idx_automation_log_flow 
ON comment_automation_log(flow_id);

-- Step 2: Update comments table with proper constraints
-- Add unique constraint on comment_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'comments_comment_id_unique'
    ) THEN
        ALTER TABLE comments 
        ADD CONSTRAINT comments_comment_id_unique UNIQUE (comment_id);
    END IF;
END $$;

-- Add processed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'processed'
    ) THEN
        ALTER TABLE comments 
        ADD COLUMN processed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add is_page_comment column to identify bot's own comments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comments' AND column_name = 'is_page_comment'
    ) THEN
        ALTER TABLE comments 
        ADD COLUMN is_page_comment BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create index for faster processed lookups
CREATE INDEX IF NOT EXISTS idx_comments_processed 
ON comments(comment_id, processed) WHERE processed = FALSE;

-- Step 3: Add comments
COMMENT ON TABLE comment_automation_log IS 'Tracks every automation action to prevent duplicates and provide audit trail';
COMMENT ON COLUMN comments.processed IS 'Indicates if automation has been executed for this comment';
COMMENT ON COLUMN comments.is_page_comment IS 'True if this comment was made by the page itself (bot reply)';

-- Step 4: Enable RLS on new table
ALTER TABLE comment_automation_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for automation log (service role only)
CREATE POLICY "Service role can manage automation log"
ON comment_automation_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
