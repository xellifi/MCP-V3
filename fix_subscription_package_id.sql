-- ============================================
-- DIAGNOSTIC & FIX: Package Route Permissions Issue
-- Run in Supabase SQL Editor
-- ============================================

-- STEP 1: Check what package IDs exist in the packages table
SELECT id, name, is_active, allowed_routes
FROM packages
WHERE is_active = true
ORDER BY name;

-- STEP 2: Check what package_id values are in subscriptions
SELECT DISTINCT package_id, COUNT(*) as cnt
FROM user_subscriptions
GROUP BY package_id
ORDER BY cnt DESC;

-- STEP 3: Find subscriptions with package_id that doesn't match any package
-- This is likely the cause of allowed_routes being null
SELECT 
    us.id,
    us.user_id,
    us.package_id,
    us.status,
    p.name as profile_name,
    pkg.name as package_name,
    pkg.allowed_routes
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
LEFT JOIN packages pkg ON pkg.id = us.package_id
WHERE pkg.id IS NULL  -- No matching package!
ORDER BY us.created_at DESC
LIMIT 20;

-- STEP 4: Get the actual FREE package ID
DO $$
DECLARE
    v_free_pkg_id TEXT;
    v_free_pkg_name TEXT;
    v_free_allowed_routes JSONB;
BEGIN
    SELECT id, name, allowed_routes::jsonb 
    INTO v_free_pkg_id, v_free_pkg_name, v_free_allowed_routes
    FROM packages
    WHERE is_active = true 
      AND LOWER(name) LIKE '%free%'
      AND LOWER(name) NOT LIKE '%lifetime%'
    LIMIT 1;
    
    RAISE NOTICE 'FREE Package ID: %', v_free_pkg_id;
    RAISE NOTICE 'FREE Package Name: %', v_free_pkg_name;
    RAISE NOTICE 'FREE Package Allowed Routes: %', v_free_allowed_routes;
END $$;

-- STEP 5: FIX - Update subscriptions with wrong package_id to use correct FREE package
-- This updates subscriptions that have 'free' (string) as package_id to use the actual UUID
UPDATE user_subscriptions us
SET package_id = (
    SELECT id FROM packages 
    WHERE is_active = true 
      AND LOWER(name) LIKE '%free%'
      AND LOWER(name) NOT LIKE '%lifetime%'
    LIMIT 1
)
WHERE us.package_id = 'free'
  OR NOT EXISTS (SELECT 1 FROM packages WHERE id = us.package_id);

-- STEP 6: Verify the fix
SELECT 
    us.id,
    us.user_id,
    us.package_id,
    us.status,
    p.name as profile_name,
    pkg.name as package_name,
    pkg.allowed_routes
FROM user_subscriptions us
JOIN profiles p ON p.id = us.user_id
LEFT JOIN packages pkg ON pkg.id = us.package_id
ORDER BY us.created_at DESC
LIMIT 20;
