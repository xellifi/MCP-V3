-- Scheduler Workflows Migration
-- Run this in your Supabase SQL Editor

-- Scheduler workflows (the saved workflow definitions)
CREATE TABLE IF NOT EXISTS scheduler_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused'
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  configurations JSONB NOT NULL DEFAULT '{}',
  schedule_type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'custom'
  schedule_time TIME DEFAULT '09:00',
  schedule_days INTEGER[] DEFAULT '{}', -- days of week (0-6) or day of month (1-31)
  schedule_timezone TEXT DEFAULT 'UTC',
  cron_expression TEXT, -- optional custom cron
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track generated topics to prevent duplicates
CREATE TABLE IF NOT EXISTS scheduler_topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES scheduler_workflows(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Execution logs
CREATE TABLE IF NOT EXISTS scheduler_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES scheduler_workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  error TEXT,
  -- Store execution outputs at each step
  generated_topic TEXT,
  generated_image_url TEXT,
  generated_caption TEXT,
  facebook_post_id TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduler_workflows_workspace ON scheduler_workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_workflows_status ON scheduler_workflows(status);
CREATE INDEX IF NOT EXISTS idx_scheduler_workflows_next_run ON scheduler_workflows(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_topic_history_workflow ON scheduler_topic_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_executions_workflow ON scheduler_executions(workflow_id);

-- RLS Policies
ALTER TABLE scheduler_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_topic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_executions ENABLE ROW LEVEL SECURITY;

-- Policies for scheduler_workflows
CREATE POLICY "Users can view own workspace workflows" ON scheduler_workflows
  FOR SELECT USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workspace workflows" ON scheduler_workflows
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workspace workflows" ON scheduler_workflows
  FOR UPDATE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workspace workflows" ON scheduler_workflows
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Policies for scheduler_topic_history
CREATE POLICY "Users can view own topic history" ON scheduler_topic_history
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM scheduler_workflows WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own topic history" ON scheduler_topic_history
  FOR INSERT WITH CHECK (
    workflow_id IN (
      SELECT id FROM scheduler_workflows WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

-- Policies for scheduler_executions
CREATE POLICY "Users can view own executions" ON scheduler_executions
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM scheduler_workflows WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert own executions" ON scheduler_executions
  FOR INSERT WITH CHECK (
    workflow_id IN (
      SELECT id FROM scheduler_workflows WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
      )
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_scheduler_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduler_workflows_updated_at
  BEFORE UPDATE ON scheduler_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduler_workflow_timestamp();
