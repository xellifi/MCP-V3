-- First, drop the table if it exists to start fresh
DROP TABLE IF EXISTS webview_sessions CASCADE;

-- Now create the table
CREATE TABLE webview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    workspace_id UUID NOT NULL,
    flow_id UUID NOT NULL,
    node_id TEXT NOT NULL,
    subscriber_id UUID NOT NULL,
    product_id TEXT,
    product_name TEXT,
    product_price NUMERIC,
    followup_enabled BOOLEAN DEFAULT false,
    followup_timeout_minutes INTEGER DEFAULT 5,
    followup_node_type TEXT,
    followup_node_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    shown_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    followup_sent_at TIMESTAMP WITH TIME ZONE,
    psid TEXT,
    page_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_webview_sessions_status_shown ON webview_sessions(status, shown_at);
CREATE INDEX idx_webview_sessions_workspace ON webview_sessions(workspace_id);
CREATE INDEX idx_webview_sessions_subscriber ON webview_sessions(subscriber_id);

-- Enable RLS
ALTER TABLE webview_sessions ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policy - allow all for authenticated users
CREATE POLICY "Allow all for authenticated" ON webview_sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Allow service role" ON webview_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
