-- Add promo_text and promo_icon columns to forms table
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS promo_text text DEFAULT 'Promo Only!',
ADD COLUMN IF NOT EXISTS promo_icon text DEFAULT '🔥';

-- Update RLS policies to allow updating these columns (if specific columns are restricted, otherwise this is handled by general update policy)
-- No specific column restriction typically, so standard update policy covers it.
