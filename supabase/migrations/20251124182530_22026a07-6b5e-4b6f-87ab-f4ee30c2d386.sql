-- Create table for storing user's saved tabs/links
CREATE TABLE public.user_saved_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tab_name TEXT NOT NULL,
  tab_url TEXT NOT NULL,
  tab_type TEXT NOT NULL DEFAULT 'trading_platform',
  is_active BOOLEAN DEFAULT true,
  login_credentials JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_saved_tabs ENABLE ROW LEVEL SECURITY;

-- Users can view their own tabs
CREATE POLICY "Users can view own saved tabs"
ON public.user_saved_tabs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own tabs
CREATE POLICY "Users can create own saved tabs"
ON public.user_saved_tabs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tabs
CREATE POLICY "Users can update own saved tabs"
ON public.user_saved_tabs
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own tabs
CREATE POLICY "Users can delete own saved tabs"
ON public.user_saved_tabs
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_saved_tabs_user_id ON public.user_saved_tabs(user_id);
CREATE INDEX idx_user_saved_tabs_active ON public.user_saved_tabs(user_id, is_active) WHERE is_active = true;