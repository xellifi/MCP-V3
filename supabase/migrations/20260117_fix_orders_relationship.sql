-- Fix 400 Error: foreign key relationship between 'orders' and 'subscribers'
-- The orders.subscriber_id column stores the external_id (PSID), not the UUID.
-- To allow joining, we need a FK relationship, which requires the target to be unique.

-- 1. Ensure subscribers.external_id is unique
-- Note: If there are duplicates, this will fail. Detailed handling might be needed but assuming uniqueness for now.
ALTER TABLE subscribers ADD CONSTRAINT subscribers_external_id_key UNIQUE (external_id);

-- 2. Add the Foreign Key constraint
-- We use ON DELETE SET NULL to preserve order history if a subscriber is deleted
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_subscriber_external 
FOREIGN KEY (subscriber_id) 
REFERENCES subscribers(external_id)
ON DELETE SET NULL;

-- 3. Reload schema cache (Supabase typically handles this, but explicit notify helps)
NOTIFY pgrst, 'reload schema';
