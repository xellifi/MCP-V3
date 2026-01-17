-- Add page_id and page_name to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS page_id TEXT,
ADD COLUMN IF NOT EXISTS page_name TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_orders_page_id ON orders(page_id);

-- Comment on columns
COMMENT ON COLUMN orders.page_id IS 'Facebook Page ID where the order originated';
COMMENT ON COLUMN orders.page_name IS 'Name of the Facebook Page';
