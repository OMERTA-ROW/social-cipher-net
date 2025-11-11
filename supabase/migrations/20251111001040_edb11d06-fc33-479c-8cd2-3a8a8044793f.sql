-- Add verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_method TEXT CHECK (verification_method IN ('payment', 'followers'));

-- Create verification payments table
CREATE TABLE IF NOT EXISTS public.verification_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 150.00,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on verification_payments
ALTER TABLE public.verification_payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification payments
CREATE POLICY "Users can view own verification payments"
ON public.verification_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Service can insert verification payments
CREATE POLICY "Service can insert verification payments"
ON public.verification_payments
FOR INSERT
WITH CHECK (true);