-- Create token pools table
CREATE TABLE public.token_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  pool_name TEXT NOT NULL,
  entry_fee NUMERIC NOT NULL DEFAULT 0,
  total_pool NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0.15,
  status TEXT NOT NULL DEFAULT 'active',
  game_type TEXT NOT NULL,
  max_participants INTEGER DEFAULT 2,
  current_participants INTEGER DEFAULT 0,
  winner_id UUID,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create pool participants table
CREATE TABLE public.pool_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.token_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entry_paid NUMERIC NOT NULL,
  position INTEGER,
  score NUMERIC DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pool_id, user_id)
);

-- Create pool transactions table for payouts and commissions
CREATE TABLE public.pool_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.token_pools(id),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for token_pools
CREATE POLICY "Anyone can view active pools"
  ON public.token_pools FOR SELECT
  USING (status = 'active' OR auth.uid() = creator_id OR auth.uid() = winner_id);

CREATE POLICY "Authenticated users can create pools"
  ON public.token_pools FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Service can update pools"
  ON public.token_pools FOR UPDATE
  USING (true);

-- RLS Policies for pool_participants
CREATE POLICY "Anyone can view participants"
  ON public.pool_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join pools"
  ON public.pool_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update participants"
  ON public.pool_participants FOR UPDATE
  USING (true);

-- RLS Policies for pool_transactions
CREATE POLICY "Users can view their pool transactions"
  ON public.pool_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert pool transactions"
  ON public.pool_transactions FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_token_pools_status ON public.token_pools(status);
CREATE INDEX idx_token_pools_creator ON public.token_pools(creator_id);
CREATE INDEX idx_pool_participants_pool ON public.pool_participants(pool_id);
CREATE INDEX idx_pool_participants_user ON public.pool_participants(user_id);
CREATE INDEX idx_pool_transactions_pool ON public.pool_transactions(pool_id);
CREATE INDEX idx_pool_transactions_user ON public.pool_transactions(user_id);