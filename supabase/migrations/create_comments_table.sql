-- Create comments table for Facebook comment tracking
-- This table stores all comments received via webhook

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    post_id TEXT,
    comment_id TEXT NOT NULL UNIQUE,
    parent_comment_id TEXT,
    message TEXT,
    commenter_id TEXT NOT NULL,
    commenter_name TEXT NOT NULL,
    is_page_comment BOOLEAN DEFAULT FALSE,
    processed BOOLEAN DEFAULT FALSE,
    created_time TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_workspace ON public.comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comments_page ON public.comments(page_id);
CREATE INDEX IF NOT EXISTS idx_comments_comment_id ON public.comments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_processed ON public.comments(comment_id, processed) WHERE processed = FALSE;

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their comments" ON public.comments;

-- Create RLS policy
CREATE POLICY "Users can manage their comments" ON public.comments
  FOR ALL USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- Add comments
COMMENT ON TABLE public.comments IS 'Stores Facebook comments received via webhook for automation processing';
COMMENT ON COLUMN public.comments.comment_id IS 'Facebook comment ID (unique identifier from Facebook)';
COMMENT ON COLUMN public.comments.is_page_comment IS 'True if this comment was made by the page itself (bot reply)';
COMMENT ON COLUMN public.comments.processed IS 'Indicates if automation has been executed for this comment';
