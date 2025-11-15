-- Create table for trading and financial account connections
CREATE TABLE IF NOT EXISTS public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform_name TEXT NOT NULL,
  platform_type TEXT NOT NULL, -- 'crypto_exchange', 'stock_broker', 'nft_marketplace', 'dex'
  account_username TEXT,
  api_key TEXT,
  api_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own trading accounts"
  ON public.trading_accounts
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_platform ON public.trading_accounts(platform_name);

-- Create trigger for updating updated_at
CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();