-- Migration: Add Global Flow Templates Support
-- Allows admin users to create templates that are available to all users

-- Add columns for global template support
ALTER TABLE flow_templates 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for faster global template lookups
CREATE INDEX IF NOT EXISTS idx_flow_templates_global ON flow_templates(is_global) WHERE is_global = true;

-- Drop existing RLS policies (they will be recreated)
DROP POLICY IF EXISTS "Users can view templates in their workspace" ON flow_templates;
DROP POLICY IF EXISTS "Users can create templates in their workspace" ON flow_templates;
DROP POLICY IF EXISTS "Users can delete templates in their workspace" ON flow_templates;
DROP POLICY IF EXISTS "Users can update templates in their workspace" ON flow_templates;

-- New RLS Policies

-- SELECT: Users can view their workspace templates OR any global templates
CREATE POLICY "Users can view workspace or global templates"
  ON flow_templates FOR SELECT
  USING (
    -- Can view global templates
    is_global = true
    OR
    -- Can view templates in their own workspace
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- INSERT: Users can create templates in their workspace
CREATE POLICY "Users can create templates in their workspace"
  ON flow_templates FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own workspace templates
-- Global templates can only be updated by the creator (admin check done in app logic)
CREATE POLICY "Users can update their templates"
  ON flow_templates FOR UPDATE
  USING (
    -- Own workspace templates
    (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
    OR
    -- Global templates they created
    (is_global = true AND created_by = auth.uid())
  );

-- DELETE: Users can delete their own workspace templates
-- Global templates can only be deleted by the creator
CREATE POLICY "Users can delete their templates"
  ON flow_templates FOR DELETE
  USING (
    -- Own workspace templates (non-global)
    (is_global = false AND workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
    OR
    -- Global templates they created
    (is_global = true AND created_by = auth.uid())
  );

-- Update existing templates to set created_by to the workspace owner
UPDATE flow_templates ft
SET created_by = w.owner_id
FROM workspaces w
WHERE ft.workspace_id = w.id AND ft.created_by IS NULL;
