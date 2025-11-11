-- Create stories table for story mode features
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  view_count INTEGER DEFAULT 0
);

-- Enable RLS for stories
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Users can create their own stories
CREATE POLICY "Users can create own stories" 
ON public.stories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anyone can view active stories
CREATE POLICY "Anyone can view active stories" 
ON public.stories 
FOR SELECT 
USING (expires_at > now());

-- Users can delete their own stories
CREATE POLICY "Users can delete own stories" 
ON public.stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create post_media table for images and videos in posts
CREATE TABLE public.post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for post_media
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view media for posts they can see
CREATE POLICY "Anyone can view post media" 
ON public.post_media 
FOR SELECT 
USING (true);

-- Users can add media to their own posts
CREATE POLICY "Users can add media to own posts" 
ON public.post_media 
FOR INSERT 
WITH CHECK (
  post_id IN (
    SELECT id FROM public.posts WHERE user_id = auth.uid()
  )
);

-- Add parent_post_id to posts table for threading
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- Create indexes for faster queries (skip if exists)
CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON public.posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);