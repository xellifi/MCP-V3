-- COMPLETE webview_sessions table setup for Product Webview functionality
-- Run this in Supabase SQL Editor to ensure the table is properly configured

-- First, check if table exists and create if not
CREATE TABLE IF NOT EXISTS webview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add all required columns (safe - only adds if not exists)
DO $$
BEGIN
    -- Core session fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'workspace_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN workspace_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'external_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN external_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'flow_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN flow_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'current_node_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN current_node_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'session_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN session_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'node_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN node_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'subscriber_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN subscriber_id UUID;
    END IF;
    
    -- Page type for different webview contexts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_type') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_type TEXT DEFAULT 'product';
    END IF;
    
    -- Page configuration (stores the full node config)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_config') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_config JSONB DEFAULT '{}';
    END IF;
    
    -- Cart data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'cart') THEN
        ALTER TABLE webview_sessions ADD COLUMN cart JSONB DEFAULT '[]';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'cart_total') THEN
        ALTER TABLE webview_sessions ADD COLUMN cart_total NUMERIC DEFAULT 0;
    END IF;
    
    -- Page access token for sending messages back
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_access_token') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_access_token TEXT;
    END IF;
    
    -- Metadata for additional info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'metadata') THEN
        ALTER TABLE webview_sessions ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Expiration
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'expires_at') THEN
        ALTER TABLE webview_sessions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');
    END IF;
    
    -- Session status and response
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'status') THEN
        ALTER TABLE webview_sessions ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'user_response') THEN
        ALTER TABLE webview_sessions ADD COLUMN user_response TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'completed_at') THEN
        ALTER TABLE webview_sessions ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Product details (for convenience)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'product_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN product_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'product_name') THEN
        ALTER TABLE webview_sessions ADD COLUMN product_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'product_price') THEN
        ALTER TABLE webview_sessions ADD COLUMN product_price NUMERIC;
    END IF;
    
    -- Form data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'form_data') THEN
        ALTER TABLE webview_sessions ADD COLUMN form_data JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'customer_name') THEN
        ALTER TABLE webview_sessions ADD COLUMN customer_name TEXT;
    END IF;
    
    -- Follow-up fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'followup_enabled') THEN
        ALTER TABLE webview_sessions ADD COLUMN followup_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'followup_timeout_minutes') THEN
        ALTER TABLE webview_sessions ADD COLUMN followup_timeout_minutes INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'followup_node_type') THEN
        ALTER TABLE webview_sessions ADD COLUMN followup_node_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'followup_node_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN followup_node_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'followup_sent_at') THEN
        ALTER TABLE webview_sessions ADD COLUMN followup_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'shown_at') THEN
        ALTER TABLE webview_sessions ADD COLUMN shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'psid') THEN
        ALTER TABLE webview_sessions ADD COLUMN psid TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_id TEXT;
    END IF;
END $$;

-- Make some columns nullable (in case they were created as NOT NULL)
ALTER TABLE webview_sessions ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE webview_sessions ALTER COLUMN subscriber_id DROP NOT NULL;
ALTER TABLE webview_sessions ALTER COLUMN node_id DROP NOT NULL;
ALTER TABLE webview_sessions ALTER COLUMN flow_id DROP NOT NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_webview_sessions_external_id ON webview_sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_page_type ON webview_sessions(page_type);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_workspace ON webview_sessions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_status ON webview_sessions(status);

-- Enable RLS
ALTER TABLE webview_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Allow all for authenticated" ON webview_sessions;
DROP POLICY IF EXISTS "Allow service role" ON webview_sessions;
DROP POLICY IF EXISTS "Allow anon read" ON webview_sessions;
DROP POLICY IF EXISTS "Allow anon insert" ON webview_sessions;
DROP POLICY IF EXISTS "Allow anon update" ON webview_sessions;

-- Allow authenticated users full access
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

-- Allow anon users to read and update (needed for webview pages)
CREATE POLICY "Allow anon read" ON webview_sessions
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon insert" ON webview_sessions
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon update" ON webview_sessions
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Show current schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'webview_sessions'
ORDER BY ordinal_position;
