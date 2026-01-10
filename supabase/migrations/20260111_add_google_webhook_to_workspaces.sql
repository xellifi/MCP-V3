-- Add google_webhook_url to workspaces table for Google Sheets integration
-- This stores the Apps Script Web App URL that receives order data

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS google_webhook_url TEXT;

-- Add comment
COMMENT ON COLUMN workspaces.google_webhook_url IS 'Google Apps Script Web App URL for syncing orders to Google Sheets';
