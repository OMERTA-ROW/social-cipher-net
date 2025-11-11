-- Add platform commission tracking to sales table
ALTER TABLE sales 
ADD COLUMN platform_commission numeric DEFAULT 0,
ADD COLUMN platform_commission_rate numeric DEFAULT 0.02;

-- Add moderation fields to products table
ALTER TABLE products
ADD COLUMN is_blocked boolean DEFAULT false,
ADD COLUMN blocked_reason text,
ADD COLUMN moderation_score jsonb;

-- Create platform earnings table to track CyberLink's commission
CREATE TABLE IF NOT EXISTS platform_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.02,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on platform_earnings
ALTER TABLE platform_earnings ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform earnings
CREATE POLICY "Admins can view platform earnings"
ON platform_earnings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service can insert platform earnings
CREATE POLICY "Service can insert platform earnings"
ON platform_earnings
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_platform_earnings_sale_id ON platform_earnings(sale_id);
CREATE INDEX idx_sales_platform_commission ON sales(platform_commission);
CREATE INDEX idx_products_is_blocked ON products(is_blocked);