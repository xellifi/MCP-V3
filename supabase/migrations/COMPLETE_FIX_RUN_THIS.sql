-- ============================================
-- COMPREHENSIVE FIX FOR FACEBOOK AUTOMATION
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- 1. Add configurations column to flows table (CRITICAL - this is why settings don't save!)
ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS configurations JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN flows.configurations IS 'Stores configuration for each node (keyed by node ID) - trigger settings, templates, etc.';

CREATE INDEX IF NOT EXISTS idx_flows_configurations ON flows USING GIN (configurations);

-- 2. Add unique constraint on comment_id to prevent duplicate processing
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

-- 3. Add processed column to comments table
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

-- 4. Add is_page_comment column to identify bot's own comments
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

-- 5. Create comment_automation_log table for audit trail
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

-- Create unique index to prevent duplicate actions
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_log_unique 
ON comment_automation_log(comment_id, action_type);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_log_comment ON comment_automation_log(comment_id);
CREATE INDEX IF NOT EXISTS idx_automation_log_flow ON comment_automation_log(flow_id);
CREATE INDEX IF NOT EXISTS idx_comments_processed ON comments(comment_id, processed) WHERE processed = FALSE;

-- 6. Enable RLS and create policies
ALTER TABLE comment_automation_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can manage automation log" ON comment_automation_log;

-- Create policy
CREATE POLICY "Service role can manage automation log"
ON comment_automation_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. Add comments
COMMENT ON TABLE comment_automation_log IS 'Tracks every automation action to prevent duplicates and provide audit trail';
COMMENT ON COLUMN comments.processed IS 'Indicates if automation has been executed for this comment';
COMMENT ON COLUMN comments.is_page_comment IS 'True if this comment was made by the page itself (bot reply)';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked:

-- Check flows table has configurations column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'flows' AND column_name = 'configurations';

-- Check comments table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comments' AND column_name IN ('processed', 'is_page_comment');

-- Check automation log table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'comment_automation_log';

-- ============================================
-- DONE! 
-- Next steps:
-- 1. Verify all queries above return results
-- 2. Reconfigure your flows (settings will now save!)
-- 3. Deploy webhook to Vercel
-- 4. Test automation
-- ============================================
