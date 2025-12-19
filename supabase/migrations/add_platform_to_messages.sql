-- Add platform column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('FACEBOOK', 'INSTAGRAM'));

-- Set default platform to FACEBOOK for existing messages
UPDATE messages 
SET platform = 'FACEBOOK' 
WHERE platform IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);
