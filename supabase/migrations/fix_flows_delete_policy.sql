-- ============================================
-- FIX FLOWS TABLE RLS POLICY FOR DELETE
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their flows" ON public.flows;

-- Create comprehensive RLS policy with both USING and WITH CHECK
CREATE POLICY "Users can manage their flows" ON public.flows
  FOR ALL 
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- Verify the policy was created
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'flows';
