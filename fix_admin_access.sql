-- ==========================================
-- FIX ADMIN ACCESS AND BLANK SCREEN ISSUE
-- Run this in Supabase Dashboard > SQL Editor
-- ==========================================

DO $$
DECLARE
  -- ⚠️ REPLACE THIS EMAIL WITH YOUR REGISTRATION EMAIL
  user_email text := 'REPLACE_WITH_YOUR_EMAIL@gmail.com';
  
  -- Variables
  target_user_id uuid;
  new_workspace_id uuid;
BEGIN
  -- 1. Get the User ID from Auth system
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please check the email spelling.', user_email;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', target_user_id;

  -- 2. Fix Profile Role (Set to OWNER)
  UPDATE public.profiles 
  SET role = 'OWNER' 
  WHERE id = target_user_id;
  
  RAISE NOTICE 'Updated profile role to OWNER';

  -- 3. Create Workspace (if it doesn't exist)
  SELECT id INTO new_workspace_id FROM public.workspaces WHERE owner_id = target_user_id LIMIT 1;
  
  IF new_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, owner_id)
    VALUES ('My Workspace', target_user_id)
    RETURNING id INTO new_workspace_id;
    RAISE NOTICE 'Created new workspace: %', new_workspace_id;
  ELSE
    RAISE NOTICE 'Workspace already exists: %', new_workspace_id;
  END IF;

  -- 4. Create Workspace Settings (if missing)
  IF NOT EXISTS (SELECT 1 FROM public.workspace_settings WHERE workspace_id = new_workspace_id) THEN
    INSERT INTO public.workspace_settings (workspace_id)
    VALUES (new_workspace_id);
    RAISE NOTICE 'Created workspace settings.';
  ELSE
    RAISE NOTICE 'Workspace settings already exist.';
  END IF;

END $$;
