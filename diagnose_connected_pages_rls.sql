-- Diagnostic Query - Run this to check RLS status
-- This will show us exactly what's blocking the saves

-- 1. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'connected_pages';

-- 2. Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'connected_pages';

-- 3. Check your current user and workspace
SELECT 
    auth.uid() as my_user_id,
    auth.role() as my_role;

SELECT 
    id as workspace_id,
    name as workspace_name,
    owner_id
FROM public.workspaces 
WHERE owner_id = auth.uid();

-- 4. Try a test insert (this will show the exact error)
DO $$
DECLARE
    test_workspace_id UUID;
BEGIN
    -- Get your workspace
    SELECT id INTO test_workspace_id 
    FROM public.workspaces 
    WHERE owner_id = auth.uid() 
    LIMIT 1;
    
    IF test_workspace_id IS NULL THEN
        RAISE NOTICE 'ERROR: No workspace found for user %', auth.uid();
    ELSE
        RAISE NOTICE 'Found workspace: %', test_workspace_id;
        
        -- Try to insert a test page
        INSERT INTO public.connected_pages (
            workspace_id,
            name,
            page_id,
            page_followers,
            status
        ) VALUES (
            test_workspace_id,
            'TEST PAGE',
            'test_' || gen_random_uuid()::text,
            0,
            'CONNECTED'
        );
        
        RAISE NOTICE 'SUCCESS: Test insert worked!';
        
        -- Clean up
        DELETE FROM public.connected_pages WHERE name = 'TEST PAGE';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
        RAISE NOTICE 'DETAIL: %', SQLSTATE;
END $$;
