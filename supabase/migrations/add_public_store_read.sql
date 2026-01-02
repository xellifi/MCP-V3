-- ============================================
-- Fix: Allow Public Access to Active Stores
-- Run this in Supabase SQL Editor
-- ============================================

-- Allow public read access to active stores
-- This enables anonymous users to view store pages via /store/:slug
CREATE POLICY "stores_public_read" ON stores
    FOR SELECT USING (is_active = true);
