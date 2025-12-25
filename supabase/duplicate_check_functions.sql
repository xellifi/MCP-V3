-- ============================================
-- DUPLICATE CHECK FUNCTIONS (SECURITY DEFINER)
-- These functions bypass RLS to check for duplicates across all workspaces
-- Run this in Supabase SQL Editor
-- ============================================

-- Function to check if a Facebook profile (external_id) is already connected by another workspace
CREATE OR REPLACE FUNCTION public.check_connection_duplicate(
  check_external_id TEXT,
  exclude_workspace_id UUID
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT mc.id, mc.workspace_id, mc.name
  FROM public.meta_connections mc
  WHERE mc.external_id = check_external_id
    AND mc.workspace_id != exclude_workspace_id
  LIMIT 1;
END;
$$;

-- Function to check if a Facebook page (page_id) is already connected by another workspace
CREATE OR REPLACE FUNCTION public.check_page_duplicate(
  check_page_id TEXT,
  exclude_workspace_id UUID
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT cp.id, cp.workspace_id, cp.name
  FROM public.connected_pages cp
  WHERE cp.page_id = check_page_id
    AND cp.workspace_id != exclude_workspace_id
  LIMIT 1;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_connection_duplicate TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_page_duplicate TO authenticated;

-- ============================================
-- INSTRUCTIONS:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run
-- 4. The duplicate detection will now work across all workspaces
-- ============================================
