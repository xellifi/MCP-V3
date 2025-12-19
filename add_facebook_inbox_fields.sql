-- ============================================
-- ADD FACEBOOK MESSENGER INBOX FIELDS
-- Run this in Supabase SQL Editor
-- ============================================

-- Add external_id to conversations to map to Facebook conversation ID (PSID)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS page_id TEXT;

-- Add external_id to messages to map to Facebook message ID
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON public.conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_page_id ON public.conversations(page_id);
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);

-- Add unique constraint to prevent duplicate conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_workspace_external 
  ON public.conversations(workspace_id, external_id) 
  WHERE external_id IS NOT NULL;

-- Add unique constraint to prevent duplicate messages
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_unique 
  ON public.messages(external_id) 
  WHERE external_id IS NOT NULL;

-- ============================================
-- DONE! Schema updated for Facebook Messenger
-- ============================================
