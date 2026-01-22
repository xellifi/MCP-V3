-- ============================================
-- FIX FACEBOOK LOGIN USERS MISSING SUBSCRIPTIONS
-- Run this in Supabase SQL Editor
-- Date: 2026-01-22
-- ============================================

-- First, let's see how many users are missing subscriptions
-- (You can run this SELECT first to check)
/*
SELECT p.id, p.name, p.email, p.auth_provider, p.created_at
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
WHERE us.id IS NULL
ORDER BY p.created_at DESC;
*/

-- ============================================
-- FIX: Create FREE subscription for all users who don't have one
-- This covers Facebook login users who fell through
-- ============================================
INSERT INTO user_subscriptions (user_id, package_id, status, billing_cycle, amount, payment_method)
SELECT 
    p.id,
    COALESCE(
        (SELECT id FROM packages 
         WHERE is_active = true 
         AND (price_monthly = 0 OR LOWER(name) LIKE '%free%') 
         ORDER BY price_monthly ASC 
         LIMIT 1),
        'free'
    ),
    'Active',
    'Monthly',
    0,
    'free'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id = p.id);

-- ============================================
-- Verify: Show affected users before and after
-- ============================================
SELECT 
    p.name,
    p.email,
    p.auth_provider,
    us.package_id,
    us.status,
    pkg.name as package_name
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
LEFT JOIN packages pkg ON pkg.id = us.package_id
ORDER BY p.created_at DESC
LIMIT 20;
