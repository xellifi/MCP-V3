-- Webview Sessions Table
-- Stores temporary session data for webview interactions
-- Sessions expire after use or after a timeout period

CREATE TABLE IF NOT EXISTS webview_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT NOT NULL,                    -- Facebook PSID
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
    current_node_id TEXT,                         -- Current node in flow
    page_type TEXT NOT NULL,                      -- 'product', 'upsell', 'downsell', 'cart', 'form'
    page_config JSONB DEFAULT '{}'::jsonb,        -- Configuration for the page (product details, form fields, etc.)
    cart JSONB DEFAULT '[]'::jsonb,               -- Cart items array
    cart_total DECIMAL(10, 2) DEFAULT 0,          -- Calculated cart total
    form_data JSONB DEFAULT '{}'::jsonb,          -- Submitted form data
    user_response TEXT,                           -- 'accepted', 'declined', 'completed', etc.
    metadata JSONB DEFAULT '{}'::jsonb,           -- Additional metadata (variants, notes, UTM, etc.)
    page_access_token TEXT,                       -- Stored for sending messages back
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    completed_at TIMESTAMPTZ                      -- When the session was completed
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_webview_sessions_external_id ON webview_sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_workspace_id ON webview_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_expires_at ON webview_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_flow_id ON webview_sessions(flow_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webview_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_webview_sessions_updated_at ON webview_sessions;
CREATE TRIGGER trigger_webview_sessions_updated_at
    BEFORE UPDATE ON webview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_webview_sessions_updated_at();

-- Enable RLS
ALTER TABLE webview_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (API uses service role)
CREATE POLICY "Service role has full access to webview_sessions"
    ON webview_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE webview_sessions IS 'Stores temporary webview session data for Messenger funnel interactions';
COMMENT ON COLUMN webview_sessions.external_id IS 'Facebook Page-Scoped User ID (PSID)';
COMMENT ON COLUMN webview_sessions.page_type IS 'Type of webview page: product, upsell, downsell, cart, form';
COMMENT ON COLUMN webview_sessions.user_response IS 'User action: accepted, declined, completed, abandoned';

