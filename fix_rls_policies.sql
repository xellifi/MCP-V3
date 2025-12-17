-- ============================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- ============================================

-- Drop ALL existing policies for profiles (including new ones if re-running)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;

-- Create better RLS policies for profiles
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow inserting profiles (needed for trigger)
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view all profiles (needed for admin features)
CREATE POLICY "Authenticated can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- FIX ADMIN SETTINGS POLICIES
-- ============================================

-- Drop existing admin_settings policies
DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated can read admin settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.admin_settings;

-- Allow all authenticated users to read admin settings
CREATE POLICY "Authenticated can read admin settings" ON public.admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to update admin settings (check role in profiles)
CREATE POLICY "Admins can update settings" ON public.admin_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to insert admin settings
CREATE POLICY "Admins can insert settings" ON public.admin_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- FIX WORKSPACES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage workspaces" ON public.workspaces;

-- Allow users to view all their workspaces
CREATE POLICY "Users can view workspaces" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid());

-- Allow users to create workspaces
CREATE POLICY "Users can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Allow users to update and delete their workspaces
CREATE POLICY "Users can manage workspaces" ON public.workspaces
  FOR ALL USING (owner_id = auth.uid());

-- ============================================
-- ENSURE DEFAULT DATA EXISTS
-- ============================================

-- Make sure admin_settings row exists
INSERT INTO public.admin_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DONE! Refresh the page and try logging in again
-- ============================================
