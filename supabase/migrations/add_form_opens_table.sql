-- Form Opens Tracking - Database Migration
-- Run this in your Supabase SQL Editor

-- Track when users open forms (for abandoned form follow-ups)
CREATE TABLE IF NOT EXISTS form_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id TEXT,                       -- Form ID (can be UUID or node ID)
  flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
  node_id TEXT,                       -- The form node ID
  page_id TEXT,                       -- Facebook page ID
  subscriber_id TEXT NOT NULL,        -- Facebook PSID
  subscriber_name TEXT,
  opened_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,           -- NULL until form is submitted
  followup_count INTEGER DEFAULT 0,   -- Number of follow-ups sent
  last_followup_at TIMESTAMPTZ,       -- When last follow-up was sent
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for finding pending follow-ups efficiently
CREATE INDEX IF NOT EXISTS idx_form_opens_pending 
  ON form_opens(subscriber_id, submitted_at, followup_count) 
  WHERE submitted_at IS NULL;

-- Index for looking up by subscriber
CREATE INDEX IF NOT EXISTS idx_form_opens_subscriber 
  ON form_opens(subscriber_id, opened_at DESC);

-- RLS Policies
ALTER TABLE form_opens ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (forms are accessed without auth)
DROP POLICY IF EXISTS "Anyone can log form opens" ON form_opens;
CREATE POLICY "Anyone can log form opens"
ON form_opens FOR INSERT
WITH CHECK (true);

-- Allow public updates for marking submissions
DROP POLICY IF EXISTS "Anyone can update form opens" ON form_opens;
CREATE POLICY "Anyone can update form opens"
ON form_opens FOR UPDATE
USING (true);

-- Allow reading for authenticated users in same workspace
DROP POLICY IF EXISTS "Users can view form opens" ON form_opens;
CREATE POLICY "Users can view form opens"
ON form_opens FOR SELECT
USING (true);
