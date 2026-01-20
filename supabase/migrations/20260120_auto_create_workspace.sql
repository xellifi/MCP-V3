-- Auto-create workspace when a new profile is created
-- This runs with database privileges, bypassing RLS

-- Create the function that creates a workspace for new profiles
CREATE OR REPLACE FUNCTION create_workspace_for_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
AS $$
DECLARE
  workspace_name TEXT;
BEGIN
  -- Build workspace name safely
  workspace_name := COALESCE(NULLIF(TRIM(NEW.name), ''), 'My') || '''s Workspace';
  
  -- Check if user already has a workspace (prevent duplicates)
  IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = NEW.id) THEN
    INSERT INTO workspaces (name, owner_id)
    VALUES (workspace_name, NEW.id);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Failed to create workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_profile_created_create_workspace ON profiles;

-- Create the trigger on the profiles table
CREATE TRIGGER on_profile_created_create_workspace
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_workspace_for_new_profile();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_workspace_for_new_profile() TO service_role;
