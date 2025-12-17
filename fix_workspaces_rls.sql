-- ============================================
-- COMPLETE FIX FOR WORKSPACES RLS
-- Run this in Supabase SQL Editor
-- ============================================

-- First, drop ALL existing workspace policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage workspaces" ON public.workspaces;

-- Create a simple policy that allows users to view workspaces they own
CREATE POLICY "View own workspaces" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid());

-- Allow users to insert their own workspaces
CREATE POLICY "Insert own workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Allow users to update/delete their own workspaces  
CREATE POLICY "Update own workspaces" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Delete own workspaces" ON public.workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================
-- VERIFY: Check if admin has workspace
-- ============================================
SELECT 
  p.email,
  p.role,
  w.id as workspace_id,
  w.name as workspace_name
FROM public.profiles p
LEFT JOIN public.workspaces w ON w.owner_id = p.id
WHERE p.email = 'admin@mychatpilot.com';
