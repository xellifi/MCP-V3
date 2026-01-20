-- ============================================
-- SIMPLE FIX: Create FREE subscription for all users
-- Your packages.id is TEXT but user_subscriptions.package_id is UUID
-- We need to find a real UUID package or fix the schema
-- ============================================

-- OPTION 1: Check if there are any packages with UUID IDs
SELECT id, name, price_monthly, pg_typeof(id) as id_type
FROM packages 
LIMIT 5;

-- OPTION 2: Check user_subscriptions schema
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions';

-- OPTION 3: If packages.id is TEXT and user_subscriptions.package_id is UUID,
-- we need to alter the packages table to use proper UUIDs
-- First, let's see the current packages structure:
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'packages';
