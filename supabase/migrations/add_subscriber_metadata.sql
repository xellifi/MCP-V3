-- Add metadata column to subscribers table for storing cart and other user data
ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for better query performance on metadata
CREATE INDEX IF NOT EXISTS idx_subscribers_metadata ON subscribers USING GIN (metadata);

-- Comment explaining the column
COMMENT ON COLUMN subscribers.metadata IS 'Stores cart data, preferences, and other subscriber-specific information as JSON';
