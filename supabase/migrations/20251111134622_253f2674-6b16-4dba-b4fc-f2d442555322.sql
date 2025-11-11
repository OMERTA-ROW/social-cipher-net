-- Create user wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet"
ON public.user_wallets FOR SELECT
USING (auth.uid() = user_id);

-- Service can update wallets
CREATE POLICY "Service can manage wallets"
ON public.user_wallets FOR ALL
USING (true);

-- Create wallet transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'withdrawal', 'subscription_payment', 'refund')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Service can insert transactions
CREATE POLICY "Service can insert transactions"
ON public.wallet_transactions FOR INSERT
WITH CHECK (true);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  payment_method TEXT NOT NULL DEFAULT 'stripe',
  payment_details JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawals"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all withdrawals
CREATE POLICY "Admins can manage withdrawals"
ON public.withdrawal_requests FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(transaction_type);
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- Trigger to update wallet updated_at
CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to credit wallet from earnings
CREATE OR REPLACE FUNCTION credit_wallet_from_earning()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update wallet
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (NEW.creator_id, NEW.amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    balance = user_wallets.balance + NEW.amount,
    updated_at = now();
  
  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, metadata)
  VALUES (
    NEW.creator_id, 
    NEW.amount, 
    'earning',
    'Earnings from ' || NEW.earning_type,
    jsonb_build_object('earning_id', NEW.id, 'earning_type', NEW.earning_type)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on creator_earnings to auto-credit wallet
CREATE TRIGGER auto_credit_wallet
AFTER INSERT ON public.creator_earnings
FOR EACH ROW
EXECUTE FUNCTION credit_wallet_from_earning();