-- Create posts table with monetization support
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_url text,
  media_type text,
  monetization_type text DEFAULT 'free' CHECK (monetization_type IN ('free', 'pay_per_view', 'pay_per_click')),
  price numeric DEFAULT 0,
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create post views tracking table
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  ip_address text
);

-- Create post clicks tracking table
CREATE TABLE IF NOT EXISTS post_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  clicker_id uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  ip_address text
);

-- Create post payments table
CREATE TABLE IF NOT EXISTS post_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES profiles(id),
  amount numeric NOT NULL,
  stripe_payment_id text NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('pay_per_view', 'pay_per_click')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamp with time zone DEFAULT now()
);

-- Create earnings table for creators
CREATE TABLE IF NOT EXISTS creator_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  earning_type text NOT NULL CHECK (earning_type IN ('pay_per_view', 'pay_per_click')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Anyone can view free posts" ON posts FOR SELECT USING (monetization_type = 'free' OR auth.uid() = user_id);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for post_views
CREATE POLICY "Anyone can view post views" ON post_views FOR SELECT USING (true);
CREATE POLICY "Service can insert views" ON post_views FOR INSERT WITH CHECK (true);

-- RLS Policies for post_clicks
CREATE POLICY "Anyone can view post clicks" ON post_clicks FOR SELECT USING (true);
CREATE POLICY "Service can insert clicks" ON post_clicks FOR INSERT WITH CHECK (true);

-- RLS Policies for post_payments
CREATE POLICY "Users can view own payments" ON post_payments FOR SELECT USING (auth.uid() = payer_id);
CREATE POLICY "Service can insert payments" ON post_payments FOR INSERT WITH CHECK (true);

-- RLS Policies for creator_earnings
CREATE POLICY "Creators can view own earnings" ON creator_earnings FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Service can insert earnings" ON creator_earnings FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_clicks_post_id ON post_clicks(post_id);
CREATE INDEX IF NOT EXISTS idx_post_payments_post_id ON post_payments(post_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_id ON creator_earnings(creator_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();