-- Add configurations column to flows table
-- This stores node-specific configurations like page selections, templates, AI settings

ALTER TABLE public.flows 
ADD COLUMN IF NOT EXISTS configurations JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.flows.configurations IS 'Stores node-specific configurations including page selections, message templates, and AI settings';
