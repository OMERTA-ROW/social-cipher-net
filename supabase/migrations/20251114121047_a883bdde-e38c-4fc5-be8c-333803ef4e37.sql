-- Create mentions table for tracking @mentions in posts and comments
CREATE TABLE IF NOT EXISTS public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_post_mention UNIQUE(post_id, mentioned_user_id)
);

-- Enable RLS
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view mentions"
  ON public.mentions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create mentions in own posts"
  ON public.mentions
  FOR INSERT
  WITH CHECK (auth.uid() = mentioner_user_id);

-- Create index for better performance
CREATE INDEX idx_mentions_mentioned_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_post ON public.mentions(post_id);