-- Comprehensive Fix for Admin Settings RLS
-- This allows admins to save Facebook App configuration and other settings
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Allow anonymous read for webhook" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can read settings" ON public.admin_settings;

-- Step 2: Create new policy: Allow anyone to READ (needed for webhook and OAuth)
CREATE POLICY "Allow anonymous read for webhook" ON public.admin_settings
  FOR SELECT 
  USING (true);

-- Step 3: Create policy: Only admins can UPDATE
CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 4: Create policy: Only admins can INSERT (for UPSERT operations)
CREATE POLICY "Admins can insert settings" ON public.admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Ensure the default row exists
INSERT INTO public.admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Step 6: Verify the policies were created
SELECT 
  policyname, 
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'admin_settings'
ORDER BY policyname;

-- Step 7: Test if current admin user can update (optional - for debugging)
-- Uncomment to test:
-- DO $$
-- BEGIN
--   -- Check if user is admin
--   IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
--     RAISE NOTICE 'User is admin, testing UPDATE...';
--     
--     -- Try to update admin_settings
--     UPDATE public.admin_settings 
--     SET facebook_app_id = COALESCE(facebook_app_id, 'test')
--     WHERE id = 1;
--     
--     RAISE NOTICE 'UPDATE successful!';
--   ELSE
--     RAISE NOTICE 'User is NOT admin. User ID: %, Role: %', 
--       auth.uid(), 
--       (SELECT role FROM public.profiles WHERE id = auth.uid());
--   END IF;
-- EXCEPTION
--   WHEN OTHERS THEN
--     RAISE NOTICE 'UPDATE failed with error: %', SQLERRM;
-- END $$;
