-- Create node_analytics table
CREATE TABLE IF NOT EXISTS node_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    subscriber_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(flow_id, node_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_node_analytics_flow_id ON node_analytics(flow_id);

-- Enable RLS
ALTER TABLE node_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read analytics for flows in their workspaces
CREATE POLICY "Users can read node analytics for their flows" ON node_analytics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM flows f
            JOIN workspaces w ON f.workspace_id = w.id
            WHERE f.id = node_analytics.flow_id
            AND w.owner_id = auth.uid()
        )
    );

-- Service role can insert/update
CREATE POLICY "Service role can manage node analytics" ON node_analytics
    FOR ALL
    USING (auth.role() = 'service_role');
