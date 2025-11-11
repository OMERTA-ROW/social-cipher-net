-- Fix search_path for credit_wallet_from_earning function
DROP TRIGGER IF EXISTS auto_credit_wallet ON public.creator_earnings;
DROP FUNCTION IF EXISTS credit_wallet_from_earning();

CREATE OR REPLACE FUNCTION credit_wallet_from_earning()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate trigger
CREATE TRIGGER auto_credit_wallet
AFTER INSERT ON public.creator_earnings
FOR EACH ROW
EXECUTE FUNCTION credit_wallet_from_earning();