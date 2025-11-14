-- Create external mining accounts table
CREATE TABLE IF NOT EXISTS public.external_mining_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'search' or 'created'
  platform TEXT NOT NULL, -- e.g., 'nicehash', 'binance', 'coinbase', 'custom'
  api_key TEXT,
  api_secret TEXT,
  wallet_address TEXT,
  mining_type TEXT NOT NULL, -- 'draco' or 'zozo'
  is_active BOOLEAN NOT NULL DEFAULT true,
  optimization_level TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'high', 'maximum'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_mining_accounts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own external mining accounts
CREATE POLICY "Users can manage own external mining accounts"
ON public.external_mining_accounts
FOR ALL
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_external_mining_accounts_user_id ON public.external_mining_accounts(user_id);
CREATE INDEX idx_external_mining_accounts_mining_type ON public.external_mining_accounts(mining_type);

-- Create trigger to update updated_at
CREATE TRIGGER update_external_mining_accounts_updated_at
BEFORE UPDATE ON public.external_mining_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();