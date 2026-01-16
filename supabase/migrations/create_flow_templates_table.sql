-- Flow Templates Table
-- Stores reusable flow templates that can be imported/exported

CREATE TABLE flow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  configurations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster workspace lookups
CREATE INDEX idx_flow_templates_workspace ON flow_templates(workspace_id);

-- RLS policies
ALTER TABLE flow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their workspace"
  ON flow_templates FOR SELECT
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can create templates in their workspace"
  ON flow_templates FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete templates in their workspace"
  ON flow_templates FOR DELETE
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update templates in their workspace"
  ON flow_templates FOR UPDATE
  USING (workspace_id IN (
    SELECT id FROM workspaces WHERE owner_id = auth.uid()
  ));
