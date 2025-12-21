-- Add configurations column to flows table
-- This column stores the configuration for each node (trigger settings, action templates, etc.)

ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS configurations JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN flows.configurations IS 'Stores configuration for each node (keyed by node ID)';

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_flows_configurations ON flows USING GIN (configurations);
