-- Orders table for storing completed orders
-- This table stores orders from both form submissions and checkout confirmations

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subscriber_external_id TEXT,
    customer_name TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total DECIMAL(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
    form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_workspace_id ON orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_subscriber_external_id ON orders(subscriber_external_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Add RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (if they exist) then recreate
DROP POLICY IF EXISTS "Users can view orders in their workspace" ON orders;
DROP POLICY IF EXISTS "Users can create orders in their workspace" ON orders;
DROP POLICY IF EXISTS "Users can update orders in their workspace" ON orders;
DROP POLICY IF EXISTS "Users can manage their orders" ON orders;
DROP POLICY IF EXISTS "Service role has full access to orders" ON orders;

-- Policy: Users can manage their orders (matching your existing pattern)
CREATE POLICY "Users can manage their orders" ON orders
    FOR ALL USING (
        workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    );

-- Policy: Service role can do everything (for webhook operations)
CREATE POLICY "Service role has full access to orders" ON orders
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON orders TO anon, authenticated;

-- Comment on table
COMMENT ON TABLE orders IS 'Stores completed orders from checkout flows including main products, upsells, and downsells';
COMMENT ON COLUMN orders.items IS 'JSONB array of cart items with productName, productPrice, quantity, isMainProduct, isUpsell, isDownsell flags';
COMMENT ON COLUMN orders.metadata IS 'Additional order metadata including synced_to_sheets flag, sheet_name, etc.';
