-- Form Node Feature - Database Migration
-- Run this in your Supabase SQL Editor

-- Create forms table to store form templates
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
  node_id TEXT,
  name TEXT NOT NULL DEFAULT 'Untitled Form',
  header_image_url TEXT,
  submit_button_text TEXT DEFAULT 'Submit',
  submit_button_color TEXT DEFAULT '#6366f1',
  border_radius TEXT DEFAULT 'rounded' CHECK (border_radius IN ('rounded', 'round', 'full')),
  success_message TEXT DEFAULT 'Thank you for your submission!',
  google_sheet_id TEXT,
  google_sheet_name TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create form_submissions table to store user submissions
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  subscriber_external_id TEXT,
  subscriber_name TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  synced_to_sheets BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_forms_workspace ON forms(workspace_id);
CREATE INDEX IF NOT EXISTS idx_forms_flow ON forms(flow_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions(created_at);

-- RLS Policies for forms table
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view forms in their workspace" ON forms;
CREATE POLICY "Users can view forms in their workspace"
ON forms FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create forms in their workspace" ON forms;
CREATE POLICY "Users can create forms in their workspace"
ON forms FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update forms in their workspace" ON forms;
CREATE POLICY "Users can update forms in their workspace"
ON forms FOR UPDATE
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete forms in their workspace" ON forms;
CREATE POLICY "Users can delete forms in their workspace"
ON forms FOR DELETE
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- RLS Policies for form_submissions table
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view submissions for their forms" ON form_submissions;
CREATE POLICY "Users can view submissions for their forms"
ON form_submissions FOR SELECT
USING (
  form_id IN (
    SELECT id FROM forms WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  )
);

-- Allow anonymous form submissions (public forms)
DROP POLICY IF EXISTS "Anyone can submit forms" ON form_submissions;
CREATE POLICY "Anyone can submit forms"
ON form_submissions FOR INSERT
WITH CHECK (true);

-- Allow public read of forms for form rendering (by form id)
DROP POLICY IF EXISTS "Public can view forms by id" ON forms;
CREATE POLICY "Public can view forms by id"
ON forms FOR SELECT
USING (true);
