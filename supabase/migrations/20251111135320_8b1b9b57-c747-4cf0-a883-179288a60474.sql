-- Add crypto wallet addresses table
CREATE TABLE IF NOT EXISTS public.crypto_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL CHECK (chain IN ('ethereum', 'bitcoin', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, wallet_address, chain)
);

-- Enable RLS
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crypto wallets"
ON public.crypto_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add crypto wallets"
ON public.crypto_wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crypto wallets"
ON public.crypto_wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Add crypto transactions table
CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_hash TEXT NOT NULL,
  chain TEXT NOT NULL,
  crypto_currency TEXT NOT NULL,
  crypto_amount NUMERIC NOT NULL,
  usd_value NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'subscription_payment', 'earning')),
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  confirmations INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crypto transactions"
ON public.crypto_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert crypto transactions"
ON public.crypto_transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update crypto transactions"
ON public.crypto_transactions FOR UPDATE
USING (true);

-- Add crypto balance to user_wallets
ALTER TABLE public.user_wallets
ADD COLUMN IF NOT EXISTS crypto_balance JSONB DEFAULT '{}'::jsonb;

-- Add crypto withdrawal support to withdrawal_requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS crypto_address TEXT,
ADD COLUMN IF NOT EXISTS crypto_currency TEXT,
ADD COLUMN IF NOT EXISTS crypto_chain TEXT;

-- Create indexes
CREATE INDEX idx_crypto_wallets_user_id ON public.crypto_wallets(user_id);
CREATE INDEX idx_crypto_wallets_address ON public.crypto_wallets(wallet_address);
CREATE INDEX idx_crypto_transactions_user_id ON public.crypto_transactions(user_id);
CREATE INDEX idx_crypto_transactions_hash ON public.crypto_transactions(transaction_hash);
CREATE INDEX idx_crypto_transactions_status ON public.crypto_transactions(status);