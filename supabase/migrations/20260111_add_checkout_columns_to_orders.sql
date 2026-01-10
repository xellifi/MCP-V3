-- Add shipping and payment columns to orders table
-- Migration for enhanced checkout with shipping info and payment methods

-- Add new columns for shipping information
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add columns for pricing breakdown
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10, 2) DEFAULT 0;

-- Add columns for payment information
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_name TEXT DEFAULT 'Cash on Delivery';

-- Add source column to track where order came from
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'unknown';

-- Rename subscriber_external_id to subscriber_id if needed (match the code)
-- Note: Some tables might use subscriber_external_id, some use subscriber_id
-- We'll add subscriber_id as an alias
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subscriber_id TEXT;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- Comment on new columns
COMMENT ON COLUMN orders.customer_phone IS 'Customer phone number for shipping';
COMMENT ON COLUMN orders.customer_email IS 'Customer email address';
COMMENT ON COLUMN orders.customer_address IS 'Full shipping address';
COMMENT ON COLUMN orders.subtotal IS 'Order subtotal before shipping';
COMMENT ON COLUMN orders.shipping_fee IS 'Shipping fee amount';
COMMENT ON COLUMN orders.payment_method IS 'Payment method ID (cod, gcash, bank, etc.)';
COMMENT ON COLUMN orders.payment_method_name IS 'Human readable payment method name';
COMMENT ON COLUMN orders.source IS 'Order source (webview_checkout, form, messenger, etc.)';
