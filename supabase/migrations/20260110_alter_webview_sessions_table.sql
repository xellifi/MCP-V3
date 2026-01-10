-- ALTER TABLE for webview_sessions to add missing columns
-- Run this in Supabase SQL Editor

-- Add the missing columns that the API code expects
DO $$
BEGIN
    -- Add external_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'external_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN external_id TEXT;
    END IF;

    -- Add current_node_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'current_node_id') THEN
        ALTER TABLE webview_sessions ADD COLUMN current_node_id TEXT;
    END IF;

    -- Add page_type if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_type') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_type TEXT DEFAULT 'upsell';
    END IF;

    -- Add page_config if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_config') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_config JSONB DEFAULT '{}';
    END IF;

    -- Add cart if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'cart') THEN
        ALTER TABLE webview_sessions ADD COLUMN cart JSONB DEFAULT '[]';
    END IF;

    -- Add cart_total if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'cart_total') THEN
        ALTER TABLE webview_sessions ADD COLUMN cart_total NUMERIC DEFAULT 0;
    END IF;

    -- Add page_access_token if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'page_access_token') THEN
        ALTER TABLE webview_sessions ADD COLUMN page_access_token TEXT;
    END IF;

    -- Add metadata if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webview_sessions' AND column_name = 'metadata') THEN
        ALTER TABLE webview_sessions ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Make session_id nullable if it was required (since we're not using it in the new code)
ALTER TABLE webview_sessions ALTER COLUMN session_id DROP NOT NULL;
ALTER TABLE webview_sessions ALTER COLUMN subscriber_id DROP NOT NULL;

-- Create index on external_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_webview_sessions_external_id ON webview_sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_webview_sessions_page_type ON webview_sessions(page_type);

-- Show current schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'webview_sessions'
ORDER BY ordinal_position;
