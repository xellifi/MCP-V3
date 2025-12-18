-- FINAL FIX for Connected Pages RLS
-- This MUST be run in Supabase SQL Editor to allow saving pages
-- The pages are being fetched successfully but RLS is blocking the saves

-- Step 1: Completely disable RLS temporarily
ALTER TABLE public.connected_pages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their pages" ON public.connected_pages;
    DROP POLICY IF EXISTS "Users can view their pages" ON public.connected_pages;
    DROP POLICY IF EXISTS "Users can create pages" ON public.connected_pages;
    DROP POLICY IF EXISTS "Users can update pages" ON public.connected_pages;
    DROP POLICY IF EXISTS "Users can delete pages" ON public.connected_pages;
    DROP POLICY IF EXISTS "Authenticated users can manage pages" ON public.connected_pages;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.connected_pages ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONE simple policy that allows EVERYTHING for authenticated users
CREATE POLICY "allow_all_for_workspace_owners" 
ON public.connected_pages
FOR ALL 
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces 
        WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces 
        WHERE owner_id = auth.uid()
    )
);

-- Step 5: Verify the policy was created
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'connected_pages';

-- Step 6: Test if you can insert (this should work now)
-- Uncomment to test:
-- SELECT auth.uid() as my_user_id;
-- SELECT id, owner_id FROM public.workspaces WHERE owner_id = auth.uid();
