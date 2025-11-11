-- Create followers table to track user followers
CREATE TABLE IF NOT EXISTS public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view followers
CREATE POLICY "Anyone can view followers"
ON public.followers FOR SELECT
USING (true);

-- Authenticated users can follow others
CREATE POLICY "Users can follow others"
ON public.followers FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.followers FOR DELETE
USING (auth.uid() = follower_id);

-- Create index for performance
CREATE INDEX idx_followers_following_id ON public.followers(following_id);
CREATE INDEX idx_followers_follower_id ON public.followers(follower_id);

-- Create function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.followers
  WHERE following_id = user_uuid;
$$;

-- Create function to get total view count for a user
CREATE OR REPLACE FUNCTION get_total_views(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(view_count), 0)::INTEGER
  FROM public.posts
  WHERE user_id = user_uuid;
$$;