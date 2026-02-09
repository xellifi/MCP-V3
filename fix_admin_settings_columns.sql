-- ============================================
-- FIX MISSING COLUMNS IN ADMIN_SETTINGS TABLE
-- Run this in your Supabase SQL Editor
-- ============================================

-- The error "Could not find the 'available_currencies' column" indicates
-- the admin_settings table is missing some columns from a recent migration.

-- Check if column exists before adding (prevents error if already exists)
DO $$ 
BEGIN
    -- Add available_currencies column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'available_currencies'
    ) THEN
        ALTER TABLE public.admin_settings 
        ADD COLUMN available_currencies jsonb DEFAULT '["PHP", "USD", "EUR", "GBP"]'::jsonb;
        RAISE NOTICE 'Added available_currencies column';
    END IF;

    -- Add default_currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'default_currency'
    ) THEN
        ALTER TABLE public.admin_settings 
        ADD COLUMN default_currency text DEFAULT 'PHP';
        RAISE NOTICE 'Added default_currency column';
    END IF;

    -- Add affiliate_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'affiliate_enabled'
    ) THEN
        ALTER TABLE public.admin_settings 
        ADD COLUMN affiliate_enabled boolean DEFAULT true;
        RAISE NOTICE 'Added affiliate_enabled column';
    END IF;

    -- Add affiliate_commission_rate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'affiliate_commission_rate'
    ) THEN
        ALTER TABLE public.admin_settings 
        ADD COLUMN affiliate_commission_rate numeric DEFAULT 20;
        RAISE NOTICE 'Added affiliate_commission_rate column';
    END IF;

    -- Add email_verification_required column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'email_verification_required'
    ) THEN
        ALTER TABLE public.admin_settings 
        ADD COLUMN email_verification_required boolean DEFAULT false;
        RAISE NOTICE 'Added email_verification_required column';
    END IF;

    -- Add custom_branding column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_settings' 
        AND column_name = 'custom_branding'
    ) THEN
        ALTER TABLE public.admin_settings 
        ADD COLUMN custom_branding jsonb DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added custom_branding column';
    END IF;
END $$;

-- Insert a default row if admin_settings is empty
INSERT INTO public.admin_settings (id, available_currencies, default_currency)
SELECT 1, '["PHP", "USD", "EUR", "GBP"]'::jsonb, 'PHP'
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings LIMIT 1);

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'admin_settings'
ORDER BY ordinal_position;

-- ============================================
-- FIX ADMIN RLS POLICY RECURSION
-- The "Admins can manage all profiles" policy causes infinite recursion
-- ============================================

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.ticket_messages;

-- Note: Admin operations should use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
