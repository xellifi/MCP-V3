-- Add email column to subscribers table
ALTER TABLE subscribers
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- Add index for better query performance on email
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers (email);

-- Comment explaining the column
COMMENT ON COLUMN subscribers.email IS 'Email address of the subscriber, fetched from Facebook if available';
