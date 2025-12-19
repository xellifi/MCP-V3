-- Create reactions table for message reactions
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  reaction TEXT NOT NULL CHECK (reaction IN ('LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'LIKE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

-- Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Allow users to add reactions
CREATE POLICY "Users can add reactions"
ON reactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view all reactions
CREATE POLICY "Users can view reactions"
ON reactions FOR SELECT
TO authenticated
USING (true);

-- Allow users to delete their own reactions
CREATE POLICY "Users can delete their own reactions"
ON reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
