-- Migration: Add and fix is_visible column in packages table
-- Run this in your Supabase SQL Editor

-- Step 1: Check if column exists and add it if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'is_visible'
    ) THEN
        ALTER TABLE packages ADD COLUMN is_visible BOOLEAN DEFAULT TRUE NOT NULL;
        RAISE NOTICE 'Column is_visible added to packages table with DEFAULT TRUE';
    ELSE
        RAISE NOTICE 'Column is_visible already exists';
        
        -- Make sure the column has proper default
        ALTER TABLE packages ALTER COLUMN is_visible SET DEFAULT TRUE;
        
        -- Set NOT NULL constraint if needed (after setting defaults)
        ALTER TABLE packages ALTER COLUMN is_visible SET NOT NULL;
    END IF;
END $$;

-- Step 2: Fix any NULL values (make them visible by default)
UPDATE packages SET is_visible = TRUE WHERE is_visible IS NULL;

-- Step 3: Verify the column was added correctly
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'packages' AND column_name = 'is_visible';

-- Step 4: View current packages with their visibility status
SELECT id, name, price_monthly, is_active, is_visible 
FROM packages 
ORDER BY price_monthly ASC;

-- =============================================================================
-- MANUAL COMMANDS TO HIDE/SHOW SPECIFIC PACKAGES
-- =============================================================================

-- To HIDE a specific package (replace 'your-package-id' with actual ID):
-- UPDATE packages SET is_visible = false WHERE id = 'your-package-id';

-- To SHOW a hidden package:
-- UPDATE packages SET is_visible = true WHERE id = 'your-package-id';

-- To see all hidden packages:
-- SELECT id, name FROM packages WHERE is_visible = false;

-- =============================================================================
-- EXAMPLE: Hide the 'free' package
-- =============================================================================
-- UPDATE packages SET is_visible = false WHERE id = 'free';
-- Then run this to confirm:
-- SELECT id, name, is_visible FROM packages;
