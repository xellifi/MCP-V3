-- ============================================
-- Fix: Allow Public Order Placement
-- Run this in Supabase SQL Editor
-- ============================================

-- Problem: The checkout process inserts an order then tries to select it,
-- but anonymous users can only INSERT (not SELECT) their own orders.
-- 
-- Solution: Add a policy that allows anyone to read orders they just created
-- by matching the order with a temporary session or simply allowing the
-- INSERT to return the data using Supabase's built-in behavior.

-- Option 1: Allow public to read orders (simplest, but less secure)
-- This works because Supabase's .insert().select() needs read access
CREATE POLICY "orders_public_select" ON store_orders
    FOR SELECT USING (true);

-- Similarly for order_items
CREATE POLICY "order_items_public_select" ON order_items
    FOR SELECT USING (true);
