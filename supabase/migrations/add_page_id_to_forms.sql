-- Add page_id column to forms table
-- This column links forms to the Facebook page they're associated with

ALTER TABLE forms ADD COLUMN IF NOT EXISTS page_id TEXT;

-- Add index for faster page-based queries
CREATE INDEX IF NOT EXISTS idx_forms_page_id ON forms(page_id);
