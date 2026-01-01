-- Add sent_followup_ids column to form_opens table
-- Run this in your Supabase SQL Editor

-- Add column to track which scheduled followups have been sent
ALTER TABLE form_opens 
ADD COLUMN IF NOT EXISTS sent_followup_ids TEXT[] DEFAULT '{}';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_form_opens_sent_ids 
  ON form_opens USING GIN(sent_followup_ids);
