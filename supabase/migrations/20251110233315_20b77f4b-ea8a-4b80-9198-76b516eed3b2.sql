-- Add birthdate to profiles for age verification
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Create content moderation table
CREATE TABLE IF NOT EXISTS public.content_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'stream', 'product', 'comment', 'message')),
  content_text TEXT,
  content_url TEXT,
  is_adult_content BOOLEAN NOT NULL DEFAULT false,
  moderation_score JSONB,
  flagged_reasons TEXT[],
  reviewed_by_ai BOOLEAN DEFAULT true,
  reviewed_by_human BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;

-- Admins can view all moderation records
CREATE POLICY "Admins can view all moderation"
ON public.content_moderation
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert moderation records
CREATE POLICY "Service role can insert moderation"
ON public.content_moderation
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_moderation_content 
ON public.content_moderation(content_id, content_type);

-- Create function to check if user is 18+
CREATE OR REPLACE FUNCTION public.is_user_adult(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN birthdate IS NULL THEN false
      WHEN AGE(birthdate) >= INTERVAL '18 years' THEN true
      ELSE false
    END
  FROM public.profiles
  WHERE id = user_uuid;
$$;