-- Add processed column to comments table to track which comments have been replied to
-- This prevents duplicate replies even if webhook fires multiple times

-- First, add unique constraint on comment_id to prevent race conditions
ALTER TABLE comments 
ADD CONSTRAINT comments_comment_id_unique UNIQUE (comment_id);

-- Add processed column
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_comments_processed ON comments(comment_id, processed);

-- Add comment
COMMENT ON COLUMN comments.processed IS 'Tracks whether automation has already replied to this comment';
