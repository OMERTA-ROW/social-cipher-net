-- Create mining sessions table
CREATE TABLE IF NOT EXISTS public.mining_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mining_type TEXT NOT NULL CHECK (mining_type IN ('draco', 'zozo')),
  tokens_paid NUMERIC NOT NULL CHECK (tokens_paid >= 1 AND tokens_paid <= 100000),
  performance_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  days_duration INTEGER NOT NULL CHECK (days_duration >= 2 AND days_duration <= 4),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_mined NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mining earnings table
CREATE TABLE IF NOT EXISTS public.mining_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mining_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mining_type TEXT NOT NULL,
  amount_mined NUMERIC NOT NULL,
  mining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscription unlocks table
CREATE TABLE IF NOT EXISTS public.subscription_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('draco', 'zozo')),
  feature_unlocked TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  message_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mining_sessions
CREATE POLICY "Users can view own mining sessions"
  ON public.mining_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mining sessions"
  ON public.mining_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update mining sessions"
  ON public.mining_sessions FOR UPDATE
  USING (true);

-- RLS Policies for mining_earnings
CREATE POLICY "Users can view own mining earnings"
  ON public.mining_earnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert mining earnings"
  ON public.mining_earnings FOR INSERT
  WITH CHECK (true);

-- RLS Policies for subscription_unlocks
CREATE POLICY "Users can view own unlocks"
  ON public.subscription_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage unlocks"
  ON public.subscription_unlocks FOR ALL
  USING (true);

-- Create indexes
CREATE INDEX idx_mining_sessions_user_id ON public.mining_sessions(user_id);
CREATE INDEX idx_mining_sessions_status ON public.mining_sessions(status);
CREATE INDEX idx_mining_earnings_user_id ON public.mining_earnings(user_id);
CREATE INDEX idx_mining_earnings_session_id ON public.mining_earnings(session_id);
CREATE INDEX idx_subscription_unlocks_user_id ON public.subscription_unlocks(user_id);

-- Create function to calculate performance multiplier
CREATE OR REPLACE FUNCTION calculate_mining_multiplier(tokens_paid NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  -- Linear scaling: 1x at 1 token, 100x at 100,000 tokens
  RETURN 1.0 + ((tokens_paid - 1) / 99999.0) * 99.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to update mining sessions updated_at
CREATE OR REPLACE FUNCTION update_mining_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mining_sessions_timestamp
  BEFORE UPDATE ON public.mining_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_mining_session_timestamp();