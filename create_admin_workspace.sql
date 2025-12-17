-- ============================================
-- CREATE WORKSPACE FOR ADMIN USER
-- Run this in Supabase SQL Editor to fix the blank page
-- ============================================

-- First, get the admin user's ID and create a workspace for them
INSERT INTO public.workspaces (name, owner_id)
SELECT 'Admin Workspace', id
FROM public.profiles
WHERE email = 'admin@mychatpilot.com'
AND NOT EXISTS (
  SELECT 1 FROM public.workspaces WHERE owner_id = (
    SELECT id FROM public.profiles WHERE email = 'admin@mychatpilot.com'
  )
);

-- Verify the workspace was created
SELECT w.*, p.email as owner_email
FROM public.workspaces w
JOIN public.profiles p ON w.owner_id = p.id;
