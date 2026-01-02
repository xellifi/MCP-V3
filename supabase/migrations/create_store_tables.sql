-- ============================================
-- Online Store Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. STORES TABLE - Store settings and branding
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Branding
    name VARCHAR(255) NOT NULL DEFAULT 'My Store',
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    
    -- Styling
    primary_color VARCHAR(7) DEFAULT '#7c3aed',
    accent_color VARCHAR(7) DEFAULT '#6366f1',
    
    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    currency VARCHAR(3) DEFAULT 'PHP',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE - Product catalog
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Product Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    compare_at_price DECIMAL(12, 2),  -- Original price for discounts
    
    -- Images (JSON array of URLs)
    images JSONB DEFAULT '[]',
    
    -- Inventory
    stock_quantity INTEGER DEFAULT 0,
    track_inventory BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, draft, archived
    
    -- Organization
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ORDERS TABLE - Customer orders
CREATE TABLE IF NOT EXISTS store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    order_number VARCHAR(20) NOT NULL,
    
    -- Customer Info
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    shipping_address TEXT,
    
    -- Order Status
    status VARCHAR(30) DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    
    -- Payment
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed
    
    -- Totals
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    shipping_fee DECIMAL(12, 2) DEFAULT 0,
    discount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDER ITEMS TABLE - Line items in orders
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES store_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Product snapshot (in case product is deleted/changed)
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(12, 2) NOT NULL,
    product_image TEXT,
    
    -- Quantity
    quantity INTEGER NOT NULL DEFAULT 1,
    
    -- Line total
    line_total DECIMAL(12, 2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stores_workspace ON stores(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_orders_store ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Stores: Workspace members can manage
CREATE POLICY "stores_workspace_access" ON stores
    FOR ALL USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Products: Store owners can manage
CREATE POLICY "products_store_access" ON products
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE workspace_id IN (
                SELECT id FROM workspaces WHERE owner_id = auth.uid()
            )
        )
    );

-- Products: Public can read active products
CREATE POLICY "products_public_read" ON products
    FOR SELECT USING (status = 'active');

-- Orders: Store owners can manage
CREATE POLICY "orders_store_access" ON store_orders
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE workspace_id IN (
                SELECT id FROM workspaces WHERE owner_id = auth.uid()
            )
        )
    );

-- Orders: Public can insert (for checkout)
CREATE POLICY "orders_public_insert" ON store_orders
    FOR INSERT WITH CHECK (true);

-- Order Items: Same as orders
CREATE POLICY "order_items_access" ON order_items
    FOR ALL USING (
        order_id IN (SELECT id FROM store_orders)
    );

CREATE POLICY "order_items_public_insert" ON order_items
    FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS for auto-updating timestamps
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON store_orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON store_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Generate unique order numbers
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(20);
BEGIN
    new_number := 'ORD-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    NEW.order_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON store_orders;
CREATE TRIGGER set_order_number
    BEFORE INSERT ON store_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_order_number();
